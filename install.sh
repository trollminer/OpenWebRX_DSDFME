#!/bin/bash

# --- Color Definitions ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' 
BOLD='\033[1m'

# --- Configuration & Paths ---
OWRX_DIR="/usr/lib/python3/dist-packages/owrx"
CSDR_DIR="/usr/lib/python3/dist-packages/csdr"
HTDOCS_PLUGIN_DIR="/usr/lib/python3/dist-packages/htdocs/plugins/receiver"
LOCAL_CSDR="$(pwd)/overlay/python/csdr"
LOCAL_PLUGINS="$(pwd)/overlay/htdocs/plugins/receiver"

DEPS_REQUIRED=("ca-certificates" "curl" "git" "cmake" "build-essential" "pkg-config" "libncurses-dev" "libsndfile1-dev" "libasound2-dev")

# --- Helper Functions ---

print_header() {
    echo -e "\n${CYAN}${BOLD}================================================================${NC}"
    echo -e "${CYAN}${BOLD}  $1 ${NC}"
    echo -e "${CYAN}${BOLD}================================================================${NC}"
}

patch_content() {
    local FILE="$1"
    local SEARCH="$2"
    local INSERT="$3"
    local KEYWORD="$4"
    if [ ! -f "$FILE" ]; then echo -e "   [${RED} SKIP ${NC}] $FILE not found."; return; fi
    if grep -q "$KEYWORD" "$FILE"; then
        echo -e "   [${YELLOW} EXISTS ${NC}] $KEYWORD in $(basename "$FILE")"
    else
        echo -e "   [${GREEN} PATCH ${NC}] Adding logic to $(basename "$FILE")..."
        cp "$FILE" "$FILE.bak"
        awk -v s="$SEARCH" -v i="$INSERT" '{print $0; if (index($0, s) > 0) print i}' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
    fi
}

build_project() {
    local REPO_URL="$1"
    local PROJ_NAME="$2"
    local WORK_DIR="/tmp/dsd_build_${PROJ_NAME}"
    echo -e "${BLUE}Building ${PROJ_NAME}...${NC}"
    rm -rf "${WORK_DIR}"
    git clone --depth 1 "${REPO_URL}" "${WORK_DIR}"
    cmake -S "${WORK_DIR}" -B "${WORK_DIR}/build" -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local
    cmake --build "${WORK_DIR}/build" --parallel $(nproc)
    cmake --install "${WORK_DIR}/build"
    rm -rf "${WORK_DIR}"
}

# --- MAIN EXECUTION ---

if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}${BOLD}ERROR:${NC} Please run as root (sudo ./install_all.sh)"
  exit 1
fi

# STEP 0: System Dependencies
print_header "STEP 0: SYSTEM DEPENDENCIES"
MISSING_DEPS=()
for pkg in "${DEPS_REQUIRED[@]}"; do
    if dpkg -s "$pkg" >/dev/null 2>&1; then
        echo -e "   [${GREEN} OK ${NC}] $pkg"
    else
        echo -e "   [${YELLOW} MISSING ${NC}] $pkg"
        MISSING_DEPS+=("$pkg")
    fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${BLUE}Installing requirements via apt...${NC}"
    apt-get update && apt-get install -y "${MISSING_DEPS[@]}"
fi

# STEP 1: Smart Build (mbelib & dsd-fme)
print_header "STEP 1: REPOS & SOURCE BUILDS"
if ldconfig -p | grep -q "libmbe.so" && [ -f "/usr/local/include/mbelib.h" ]; then
    echo -e "   [${GREEN} OK ${NC}] mbelib is already installed."
else
    build_project "https://github.com/lwvmobile/mbelib.git" "mbelib"
    ldconfig
fi

if command -v dsd-fme >/dev/null 2>&1; then
    echo -e "   [${GREEN} OK ${NC}] dsd-fme is already installed."
else
    build_project "https://github.com/lwvmobile/dsd-fme.git" "dsd-fme"
    ldconfig
    hash -r
fi

# STEP 2: OpenWebRX Python Patching
print_header "STEP 2: PATCHING OPENWEBRX SOURCE"

BLOCK_FEAT_DICT='        "digital_voice_dsd_fme": ["dsd_fme"],'
BLOCK_FEAT_FUNC='
    def has_dsd_fme(self):
        """OpenWebRX can use the DSD-FME decoder for digital voice."""
        return self.command_is_runnable("dsd-fme -h")'
BLOCK_MODE_ALIAS='    aliases = { "dsd-fme-auto": "dsdfme", }'
BLOCK_MODE_DEFS='
        AnalogMode("dsdfme", "XDMA", bandpass=Bandpass(-6250, 6250), requirements=["digital_voice_dsd_fme"], squelch=False),
        AnalogMode("dsdfme-nxdn48", "NX48", bandpass=Bandpass(-6250, 6250), requirements=["digital_voice_dsd_fme"], squelch=False),
        AnalogMode("dsdfme-nxdn96", "NX96", bandpass=Bandpass(-6250, 6250), requirements=["digital_voice_dsd_fme"], squelch=False),
        AnalogMode("dsdfme-dpmr", "dPMR", bandpass=Bandpass(-6250, 6250), requirements=["digital_voice_dsd_fme"], squelch=False),'
BLOCK_DSP_ROUTING='        elif demod in ["dsdfme", "dsd-fme-auto", "dsdfme-nxdn48", "dsdfme-nxdn96", "dsdfme-dpmr"]:
            from csdr.chain.dsdfme import DsdFmeAuto
            return DsdFmeAuto(profile_key=demod)'

patch_content "$OWRX_DIR/feature.py" "\"digital_voice_m17\": [\"m17_demod\"]," "$BLOCK_FEAT_DICT" "digital_voice_dsd_fme"
patch_content "$OWRX_DIR/feature.py" "return self.command_is_runnable(\"m17-demod\", 0)" "$BLOCK_FEAT_FUNC" "def has_dsd_fme"
patch_content "$OWRX_DIR/modes.py" "class Modes(object):" "$BLOCK_MODE_ALIAS" "dsd-fme-auto"
patch_content "$OWRX_DIR/modes.py" "requirements=[\"digital_voice_m17\"], squelch=False)," "$BLOCK_MODE_DEFS" "FME-XDMA"
patch_content "$OWRX_DIR/dsp.py" "return M17()" "$BLOCK_DSP_ROUTING" "dsdfme-nxdn48"

# STEP 3: CSDR Logic Installation
print_header "STEP 3: INSTALLING CSDR DRIVER FILES"
for file in "module/dsdfme.py" "chain/dsdfme.py"; do
    DEST="$CSDR_DIR/$file"
    SRC="$LOCAL_CSDR/$file"
    if [ -f "$DEST" ]; then echo -e "   [${YELLOW} EXISTS ${NC}] $file in CSDR."; else
        if [ -f "$SRC" ]; then
            cp -v "$SRC" "$DEST" && chmod 644 "$DEST"
        else echo -e "   [${RED} ERROR ${NC}] Source $file not found!"; fi
    fi
done

# STEP 4: Install Plugin Files
print_header "STEP 4: INSTALLING WEB PLUGIN FILES"
PLUGIN_DEST="$HTDOCS_PLUGIN_DIR/dsdfme_auto"
PLUGIN_SRC="$LOCAL_PLUGINS/dsdfme_auto"
if [ -d "$PLUGIN_DEST" ]; then
    echo -e "   [${YELLOW} EXISTS ${NC}] Plugin folder already installed."
else
    if [ -d "$PLUGIN_SRC" ]; then
        mkdir -p "$PLUGIN_DEST" && cp -rv "$PLUGIN_SRC/." "$PLUGIN_DEST/"
    else
        echo -e "   [${RED} ERROR ${NC}] Source plugin folder not found!"
    fi
fi

# STEP 5: Register Plugin in receiver/init.js
print_header "STEP 5: REGISTER PLUGIN IN RECEIVER INIT.JS"
RECEIVER_INIT_JS="$HTDOCS_PLUGIN_DIR/init.js"
RECEIVER_INIT_SAMPLE="${RECEIVER_INIT_JS}.sample"

if [ ! -f "$RECEIVER_INIT_JS" ]; then
    if [ -f "$RECEIVER_INIT_SAMPLE" ]; then
        cp "$RECEIVER_INIT_SAMPLE" "$RECEIVER_INIT_JS"
        echo -e "   [${GREEN} CREATE ${NC}] Created init.js from sample"
    else
        echo -e "   [${RED} ERROR ${NC}] Neither init.js nor init.js.sample found in $HTDOCS_PLUGIN_DIR!"
        exit 1
    fi
fi

PLUGIN_LOAD_LINE="Plugins.load('dsdfme_auto');"

if ! grep -qF "$PLUGIN_LOAD_LINE" "$RECEIVER_INIT_JS"; then
    # Insert after the last Plugins.load line, or append if none exists
    if grep -q "Plugins.load" "$RECEIVER_INIT_JS"; then
        LINE=$(grep -n "Plugins.load" "$RECEIVER_INIT_JS" | tail -1 | cut -d: -f1)
        sed -i "${LINE}a ${PLUGIN_LOAD_LINE}" "$RECEIVER_INIT_JS"
        echo -e "   [${GREEN} PATCH ${NC}] Added plugin load line after line $LINE"
    else
        echo "$PLUGIN_LOAD_LINE" >> "$RECEIVER_INIT_JS"
        echo -e "   [${GREEN} PATCH ${NC}] Appended plugin load line to end of file"
    fi
else
    echo -e "   [${YELLOW} EXISTS ${NC}] Plugin already registered in init.js"
fi

print_header "INSTALLATION COMPLETE"
echo -e "${YELLOW}Restarting OpenWebRX...${NC}"
systemctl restart openwebrx
echo -e "${GREEN}${BOLD}Success! DSD-FME is now integrated into OpenWebRX.${NC}\n"
