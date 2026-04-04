#!/bin/bash
# OpenWebRX DSD-FME Master: Full Build & Integration
# Version: 6.1 - Robust File Handling
set -e

# ==========================================================
# 0. COLORS & PRE-FLIGHT
# ==========================================================
HEADER='\033[1;34m'
INFO='\033[0;36m'
SUCCESS='\033[1;32m'
WARN='\033[1;33m'
ERROR='\033[1;31m'
NC='\033[0m'

REPO_ROOT=$(pwd)

if [[ $EUID -ne 0 ]]; then
   echo -e "${ERROR}FAIL: This script must be run as root (sudo).${NC}"
   exit 1
fi

# ==========================================================
# STEP 1: SYSTEM DEPENDENCIES
# ==========================================================
echo -e "${HEADER}===> [STEP 1] CHECKING SYSTEM DEPENDENCIES <===${NC}"

PACKAGES=(
    "ca-certificates" "curl" "git" "cmake" "build-essential" 
    "pkg-config" "libncurses-dev" "libsndfile1-dev" "libasound2-dev" "libitpp-dev"
)

MISSING_PKGS=()
for pkg in "${PACKAGES[@]}"; do
    if dpkg -s "$pkg" >/dev/null 2>&1; then
        echo -e "${WARN}SKIP: $pkg is already installed.${NC}"
    else
        MISSING_PKGS+=("$pkg")
    fi
done

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
    echo -e "${INFO}Installing missing packages...${NC}"
    apt-get update && apt-get install -y "${MISSING_PKGS[@]}"
fi

# ==========================================================
# STEP 2: BUILD MBELIB & DSD-FME
# ==========================================================
echo -e "\n${HEADER}===> [STEP 2] BUILDING VOICES & ENGINE <===${NC}"

build_git_proj() {
    local NAME=$1
    local URL=$2
    local CHECK_FILE=$3

    if [ -f "$CHECK_FILE" ] || command -v "$NAME" &> /dev/null; then
        echo -e "${WARN}SKIP: $NAME is already installed.${NC}"
    else
        echo -e "${INFO}BUILDING: $NAME...${NC}"
        local WORKDIR=$(mktemp -d)
        git clone --depth 1 "$URL" "$WORKDIR"
        mkdir -p "$WORKDIR/build"
        cd "$WORKDIR/build"
        cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local ..
        make -j$(nproc)
        make install
        ldconfig
        cd "$REPO_ROOT"
        rm -rf "$WORKDIR"
        echo -e "${SUCCESS}SUCCESS: $NAME installed.${NC}"
    fi
}

build_git_proj "mbelib" "https://github.com/lwvmobile/mbelib.git" "/usr/local/lib/libmbe.so"
build_git_proj "dsd-fme" "https://github.com/lwvmobile/dsd-fme.git" "/usr/local/bin/dsd-fme"

# ==========================================================
# STEP 3: WEB UI INTEGRATION (Enhanced Logic)
# ==========================================================
echo -e "\n${HEADER}===> [STEP 3] WEB UI INTEGRATION <===${NC}"
HTDOCS_DEST="/usr/lib/python3/dist-packages/htdocs/plugins/receiver"
OVERLAY_SRC="$REPO_ROOT/overlay"
INIT_FILE="$HTDOCS_DEST/init.js"

mkdir -p "$HTDOCS_DEST"

if [ -f "$INIT_FILE" ]; then
    # Case: File exists
    if grep -q "dsdfme_auto" "$INIT_FILE"; then
        echo -e "${WARN}SKIP: init.js already patched.${NC}"
    else
        echo -e "${INFO}PATCHING: Appending DSD logic to existing init.js...${NC}"
        [ ! -f "${INIT_FILE}.dsd_orig" ] && cp -v "$INIT_FILE" "${INIT_FILE}.dsd_orig"
        echo "" >> "$INIT_FILE"
        cat "$OVERLAY_SRC/htdocs/plugins/receiver/init.js" >> "$INIT_FILE"
    fi
else
    # Case: File does NOT exist
    echo -e "${INFO}INSTALLING: Creating new init.js from overlay...${NC}"
    cp -v "$OVERLAY_SRC/htdocs/plugins/receiver/init.js" "$INIT_FILE"
fi

# Copy dsdfme_auto folder
if [ ! -d "$HTDOCS_DEST/dsdfme_auto" ]; then
    echo -e "${INFO}COPYING: Web assets (dsdfme_auto)...${NC}"
    mkdir -p "$HTDOCS_DEST/dsdfme_auto"
    cp -rv "$OVERLAY_SRC/htdocs/plugins/receiver/dsdfme_auto/." "$HTDOCS_DEST/dsdfme_auto/"
else
    echo -e "${WARN}SKIP: dsdfme_auto folder already exists.${NC}"
fi

# ==========================================================
# STEP 4: OWRX CORE SURGERY
# ==========================================================
echo -e "\n${HEADER}===> [STEP 4] OWRX CORE SURGERY <===${NC}"
PYTHON_OWRX="/usr/lib/python3/dist-packages/owrx"
PY_FILES=("dsp.py" "feature.py" "modes.py")

for FILE in "${PY_FILES[@]}"; do
    TARGET="$PYTHON_OWRX/$FILE"
    SOURCE="$OVERLAY_SRC/python/owrx/$FILE"
    if [ -f "$TARGET" ]; then
        [ ! -f "${TARGET}.dsd_orig" ] && cp -v "$TARGET" "${TARGET}.dsd_orig"
        if grep -qi "dsd" "$TARGET"; then
            echo -e "${WARN}SKIP: $FILE already contains DSD logic.${NC}"
        else
            echo -e "${INFO}PATCHING: Injecting DSD logic into $FILE...${NC}"
            echo "" >> "$TARGET"
            cat "$SOURCE" >> "$TARGET"
        fi
    else
        # If core files are missing, OWRX is likely not installed correctly
        echo -e "${ERROR}ERROR: $FILE not found in $PYTHON_OWRX! Skipping patch.${NC}"
    fi
done

# ==========================================================
# STEP 5: CSDR COMPONENT MIGRATION
# ==========================================================
echo -e "\n${HEADER}===> [STEP 5] CSDR MIGRATION <===${NC}"
PYTHON_CSDR="/usr/lib/python3/dist-packages/csdr"

# Ensure directories exist for CSDR
mkdir -p "$PYTHON_CSDR/module" "$PYTHON_CSDR/chain"

if [ ! -f "$PYTHON_CSDR/module/dsdfme.py" ]; then
    echo -e "${INFO}INSTALLING: CSDR Module (dsdfme.py)${NC}"
    cp -v "$OVERLAY_SRC/python/csdr/module/dsdfme.py" "$PYTHON_CSDR/module/dsdfme.py"
fi

if [ ! -f "$PYTHON_CSDR/chain/dsdfme.py" ]; then
    echo -e "${INFO}INSTALLING: CSDR Chain (dsdfme.py)${NC}"
    cp -v "$OVERLAY_SRC/python/csdr/chain/dsdfme.py" "$PYTHON_CSDR/chain/dsdfme.py"
fi

# ==========================================================
# STEP 6: FINALIZING & RESTART
# ==========================================================
echo -e "\n${HEADER}===> [STEP 6] FINALIZING SYSTEM <===${NC}"

if [ -f "/etc/systemd/system/openwebrx.service.d/override.conf" ]; then
    rm -f /etc/systemd/system/openwebrx.service.d/override.conf
    systemctl daemon-reload
fi

echo -e "${INFO}Restarting OpenWebRX service...${NC}"
systemctl restart openwebrx

echo -e "\n${SUCCESS}COMPLETE: Everything is installed and integrated!${NC}"
