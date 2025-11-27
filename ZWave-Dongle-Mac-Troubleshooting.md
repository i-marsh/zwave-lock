# Z-Wave Dongle Troubleshooting on macOS

## Quick Check: Is Your Z-Wave Dongle Detected?

### Method 1: System Information (GUI)
1. Click the **Apple menu** () → **About This Mac**
2. Click **System Report** (or **More Info** → **System Report**)
3. Under **Hardware**, select **USB**
4. Look for your Z-Wave dongle in the device tree
   - Common names: "Z-Wave Serial Controller", "Aeotec Z-Stick", "Zooz ZST10", "UZB", "Serial Converter"
   - Note the **Product ID**, **Vendor ID**, and **Location ID**

### Method 2: Terminal Command - List USB Devices
```bash
system_profiler SPUSBDataType
```

Look for entries containing:
- "Z-Wave"
- "Serial" or "USB-Serial"
- Vendor names like "Aeotec", "Zooz", "Silicon Labs"

**Filter for serial devices:**
```bash
system_profiler SPUSBDataType | grep -A 10 -i "serial\|z-wave\|cp210\|ftdi"
```

### Method 3: Check for Serial Devices
When a Z-Wave dongle is connected, it creates a serial device file:

```bash
ls -la /dev/cu.* /dev/tty.*
```

Common Z-Wave dongle device names:
- `/dev/cu.usbserial-*` (generic USB-serial)
- `/dev/cu.usbmodem*` (some Z-Wave controllers)
- `/dev/cu.SLAB_USBtoUART` (Silicon Labs chip)
- `/dev/tty.usbserial-*` (alternative naming)

**Example output:**
```
/dev/cu.usbserial-1410
/dev/tty.usbserial-1410
```

### Method 4: Use ioreg (Advanced)
```bash
ioreg -p IOUSB -l -w 0 | grep -i "serial\|z-wave" -A 5 -B 5
```

This shows detailed USB device information from the I/O Registry.

---

## Identifying Your Z-Wave Dongle

### Common Z-Wave USB Dongles

| Brand/Model | Vendor ID | Product ID | Chip | Device Name |
|-------------|-----------|------------|------|-------------|
| Aeotec Z-Stick Gen5 | 0658 | 0200 | CP2102 | /dev/cu.SLAB_USBtoUART |
| Aeotec Z-Stick 7 | 0658 | 0200 | CP2102 | /dev/cu.SLAB_USBtoUART |
| Zooz ZST10 | 10c4 | ea60 | CP2102 | /dev/cu.SLAB_USBtoUART |
| UZB (Z-Wave.Me) | 0658 | 0200 | CP2102 | /dev/cu.usbserial-* |
| Nortek HUSBZB-1 | 10c4 | 8a2a | CP2104 | /dev/cu.usbserial-* |

### Detailed Device Information
```bash
# Get detailed info about USB serial devices
system_profiler SPUSBDataType | grep -A 20 "Z-Wave\|Serial Controller\|CP210\|SLAB"
```

---

## Testing Z-Wave Dongle Communication

### 1. Check Read/Write Permissions
```bash
ls -l /dev/cu.usbserial-*
```

You should have read/write access:
```
crw-rw-rw-  1 root  wheel  ...  /dev/cu.usbserial-1410
```

If you don't have permission:
```bash
sudo chmod 666 /dev/cu.usbserial-*
```

### 2. Test Serial Communication with screen
```bash
# Replace with your actual device path
screen /dev/cu.usbserial-1410 115200
```

**To exit screen:**
- Press `Ctrl-A` then `K` (kill)
- Confirm with `Y`

If the dongle is working, you won't see errors. Some dongles may output data when Z-Wave commands are received.

### 3. Test with cu (Call Unix)
```bash
cu -l /dev/cu.usbserial-1410 -s 115200
```

**To exit:**
- Type `~.` (tilde followed by period)

### 4. Python Serial Test
If you have Python installed:

```python
import serial
import serial.tools.list_ports

# List all serial ports
ports = serial.tools.list_ports.comports()
for port in ports:
    print(f"{port.device} - {port.description}")

# Test connection to specific port
try:
    ser = serial.Serial('/dev/cu.usbserial-1410', 115200, timeout=1)
    print(f"Connected to {ser.port}")
    print(f"Baudrate: {ser.baudrate}")
    ser.close()
    print("Connection successful!")
except Exception as e:
    print(f"Error: {e}")
```

Save as `test_zwave.py` and run:
```bash
python3 test_zwave.py
```

### 5. Install pyserial if needed
```bash
pip3 install pyserial
```

---

## Driver Installation

Some Z-Wave dongles require drivers on macOS.

### Silicon Labs CP210x Driver (Most Common)

**Check if driver is needed:**
```bash
kextstat | grep -i silabs
```

**Download and install:**
1. Visit: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
2. Download macOS driver
3. Install the .dmg package
4. **macOS 10.13+**: You may need to allow the system extension in **System Preferences** → **Security & Privacy**
5. Restart your Mac
6. Reconnect the dongle

**Verify installation:**
```bash
kextstat | grep -i silabs
```

You should see:
```
com.silabs.driver.CP210xVCPDriver
```

### FTDI Driver (Less Common)
Some older Z-Wave dongles use FTDI chips.

```bash
# Check for FTDI driver
kextstat | grep -i ftdi
```

Download from: https://ftdichip.com/drivers/vcp-drivers/

---

## Troubleshooting Common Issues

### Issue: Dongle Not Detected

**Solution 1: Try Different USB Ports**
- Try USB-A ports directly on Mac (not through hub)
- Some USB-C hubs cause issues with serial devices
- Use Apple USB-C to USB-A adapter if needed

**Solution 2: Check USB Hub**
```bash
# List all USB devices with verbose output
system_profiler SPUSBDataType -detailLevel full
```

**Solution 3: Reset SMC (Intel Macs)**
1. Shut down Mac
2. Press Shift + Control + Option (left side) + Power button
3. Hold for 10 seconds
4. Release and turn on Mac

**Solution 4: Reset USB Bus**
```bash
# Disconnect dongle first
sudo kextunload -b com.apple.driver.usb.AppleUSBEHCI
sudo kextload -b com.apple.driver.usb.AppleUSBEHCI
# Reconnect dongle
```

### Issue: Device File Not Created

**Check kernel extensions:**
```bash
kextstat | grep -i usb
```

**Check system log for errors:**
```bash
log stream --predicate 'eventMessage contains "USB"' --level info
# Then plug in the dongle and watch for messages
```

**Alternative: Check Console app**
1. Open **Console.app**
2. Plug in Z-Wave dongle
3. Look for USB-related messages

### Issue: Permission Denied

**Solution:**
```bash
# Add yourself to dialout/uucp group (if exists)
sudo dseditgroup -o edit -a $USER -t user dialout
sudo dseditgroup -o edit -a $USER -t user uucp

# Or change permissions directly
sudo chmod 666 /dev/cu.usbserial-*
```

### Issue: Device Disappears After Working

**Check USB power management:**
```bash
# Disable USB sleep (requires admin password)
sudo pmset -a usb 0
```

**Check for kernel panics:**
```bash
ls -la /Library/Logs/DiagnosticReports/
```

---

## Using Z-Wave Dongle with Software

### Home Assistant (Common Use Case)

**1. Find device path:**
```bash
ls -la /dev/cu.usbserial-* /dev/cu.SLAB_USBtoUART
```

**2. Note the path for Home Assistant configuration:**
- Use `/dev/cu.*` (not `/dev/tty.*`) on macOS
- Example: `/dev/cu.usbserial-1410`

**3. In Home Assistant Z-Wave JS:**
- Serial Port: `/dev/cu.usbserial-1410`
- Or if running in Docker, map the device to container

### Docker Container Access

**Map USB device to Docker:**
```bash
docker run -d \
  --device=/dev/cu.usbserial-1410:/dev/zwave \
  -e USB_PATH=/dev/zwave \
  your-zwave-container
```

### Z-Wave JS UI / zwavejs2mqtt

**Configuration:**
1. Serial Port: `/dev/cu.usbserial-1410`
2. If using Docker on Mac:
   ```yaml
   devices:
     - /dev/cu.usbserial-1410:/dev/zwave
   ```

---

## Monitoring Z-Wave Dongle Activity

### Real-time USB Device Events
```bash
# Terminal 1: Watch system log
log stream --predicate 'eventMessage contains "USB"' --level debug

# Terminal 2: Disconnect and reconnect dongle
```

### Check Device Statistics
```bash
# Get detailed info about specific USB device
ioreg -p IOUSB -l -w 0 -x | grep -i "usbserial\|z-wave" -A 30
```

### Monitor Serial Activity
```bash
# Install if needed
brew install lsof

# See what's accessing the serial port
lsof | grep usbserial
```

---

## Helpful Terminal Commands Summary

```bash
# Quick dongle check
ls -la /dev/cu.* | grep -i "usb\|serial"

# List USB devices
system_profiler SPUSBDataType | grep -i "serial\|z-wave" -A 10

# Check drivers
kextstat | grep -i "silabs\|ftdi"

# Test connection
screen /dev/cu.usbserial-XXXXX 115200

# Watch for USB events
log stream --predicate 'eventMessage contains "USB"' --level info

# Check permissions
ls -l /dev/cu.usbserial-*

# Monitor what's using the port
lsof | grep usbserial
```

---

## Next Steps After Verification

Once you've confirmed your Z-Wave dongle is working:

1. **Install Z-Wave software** (Home Assistant, Z-Wave JS UI, etc.)
2. **Configure the serial port** in your chosen software
3. **Include/pair devices** starting with the Schlage BE469 lock
4. **Test basic commands** (lock/unlock)
5. **Configure user codes** and settings

---

## Additional Resources

- **Silicon Labs Drivers**: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
- **Home Assistant Z-Wave JS**: https://www.home-assistant.io/integrations/zwave_js/
- **Z-Wave JS UI**: https://zwave-js.github.io/zwave-js-ui/
- **macOS Serial Port Guide**: https://pbxbook.com/other/mac-tty.html

---

## Common Z-Wave Software for macOS

| Software | Type | Best For |
|----------|------|----------|
| Home Assistant | Full Platform | Complete home automation |
| Z-Wave JS UI | Standalone | Z-Wave management & MQTT |
| Domoticz | Full Platform | Open-source automation |
| OpenZWave Control Panel | Utility | Testing & debugging |
| Homey | Platform | Consumer-friendly |

Most users run these in Docker containers on macOS.
