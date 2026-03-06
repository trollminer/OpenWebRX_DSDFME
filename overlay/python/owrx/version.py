from distutils.version import LooseVersion
import os
import re
import subprocess

def _read_base_version():
    path = "/usr/lib/python3/dist-packages/owrx/version.py"
    fallback = "1.2.107"
    try:
        if os.path.exists(path) and os.path.realpath(path) != os.path.realpath(__file__):
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                data = f.read(4096)
            m = re.search(r'_versionstring\s*=\s*"([^"]+)"', data)
            if m:
                return m.group(1)
    except Exception:
        pass
    try:
        version = subprocess.check_output(
            ["dpkg-query", "-W", "-f=${Version}", "openwebrx"],
            text=True,
        ).strip()
        m = re.search(r"(\d+(?:\.\d+)+)", version)
        if m:
            return m.group(1)
    except Exception:
        pass
    return fallback

_versionstring = _read_base_version()
looseversion = LooseVersion(_versionstring)
openwebrx_version = "v{0}".format(looseversion)
