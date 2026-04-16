
This branch includes a terminal-style output in the panel within the Openwebrx+ interface

To pull this branch - git clone --branch with-term-clean-init-file --single-branch https://github.com/trollminer/OpenWebRX_DSDFME.git

---

# OpenWebRX_DSDFME

OpenWebRX_DSDFME adds enhanced DSD-FME integration to OpenWebRX with improved digital voice metadata, protocol support, and frontend display panels.

It expands on earlier OpenWebRX_DSD work by improving DMR slot handling, encryption detection, active call highlighting, RadioID lookups, and support for multiple digital voice protocols.

## Features

* DSD-FME integration for OpenWebRX
* Live metadata panel inside the OpenWebRX web interface
* DMR dual-slot display with separate activity tracking
* Encryption detection and status display
* Active voice call highlighting
* Radio ID lookup support with caching
* Direct and group call identification
* Support for:

  * DMR
  * P25
  * NXDN
  * dPMR
* Automatic DSD-FME process management
* TCP/UDP audio routing support
* Responsive frontend styling for metadata panels

## Project Files

* `dsdfme.py`

  * Backend integration layer for DSD-FME
  * Handles process lifecycle, metadata parsing, RadioID lookups, and call state tracking

* `dsdfme_auto.js`

  * Frontend metadata panel integration for OpenWebRX
  * Adds protocol-specific layouts and DMR slot handling

* `dsdfme_auto.css`

  * Styling for metadata panels, slot cards, encryption states, and active calls

## Supported Protocols

| Protocol | Features                                                            |
| -------- | ------------------------------------------------------------------- |
| DMR      | Dual-slot view, talkgroup display, RadioID lookup, encryption state |
| P25      | Source/destination IDs, encryption detection                        |
| NXDN     | Source and destination ID parsing                                   |
| dPMR     | Basic metadata display                                              |

## Requirements

* OpenWebRX
* Supported SDR hardware

## Installation

Clone the repository:

```bash
git clone https://github.com/trollminer/OpenWebRX_DSDFME.git
cd OpenWebRX_DSDFME
```

Run the installer:

```bash
chmod +x install.sh
./install.sh
```

The installer will:

* Install DSD-FME if needed
* Copy backend and frontend files into the correct OpenWebRX directories
* Apply required integration changes automatically

After installation, restart OpenWebRX:

```bash
sudo systemctl restart openwebrx
```

## Usage

1. Open the OpenWebRX web interface
2. Tune to a supported digital voice signal
3. Select the appropriate digital demodulator mode
4. The DSDFME metadata panel will appear automatically
5. Call information, IDs, slot activity, and encryption state will update live

## Known Limitations

* Requires a compatible OpenWebRX version
* Metadata parsing depends on DSD-FME output formatting
* Radio ID lookups depend on external RadioID availability
* Different OpenWebRX versions may require minor adjustments

## Credits

Based on work from:

* Esmerok's OpenWebRX_DSD
* OpenWebRX contributors
* DSD-FME contributors
* RadioID contributors

## Contributing

Bug reports, pull requests, and protocol testing feedback are welcome.

When reporting issues, include:

* OpenWebRX version
* DSD-FME version
* SDR hardware used
* Relevant logs
* Steps to reproduce

## Original Project

* [https://github.com/esmerok/OpenWebRX_DSD](https://github.com/esmerok/OpenWebRX_DSD)
* [https://github.com/trollminer/OpenWebRX_DSDFME](https://github.com/trollminer/OpenWebRX_DSDFME)
