# Schlage BE469 Z-Wave Commands and Metrics

## Overview
The Schlage BE469 is a Z-Wave enabled deadbolt lock that supports multiple command classes for remote control, monitoring, and configuration.

---

## Supported Z-Wave Command Classes

### Door Lock (0x62)
Controls and monitors the lock/unlock state of the deadbolt.

#### Commands
- **DOOR_LOCK_OPERATION_SET** - Lock or unlock the door
  - Values: `0x00` (Unlock), `0xFF` (Lock)
- **DOOR_LOCK_OPERATION_GET** - Request current lock state
- **DOOR_LOCK_OPERATION_REPORT** - Returns current lock state
  - Lock Mode: Unsecured (0x00), Unsecured with timeout (0x01), Inside unsecured (0x10), Outside unsecured (0x20), Secured (0xFF)
  - Inside/Outside Door Handles Mode
  - Door Condition
  - Lock Timeout (minutes and seconds)
- **DOOR_LOCK_CONFIGURATION_SET** - Configure lock behavior
  - Operation Type: Constant operation, Timed operation
  - Inside/Outside Door Handles: Enabled/Disabled
  - Lock Timeout: 0-254 seconds
- **DOOR_LOCK_CONFIGURATION_GET** - Request configuration settings
- **DOOR_LOCK_CONFIGURATION_REPORT** - Returns configuration

---

### User Code (0x63)
Manages user access codes (up to 30 codes).

#### Commands
- **USER_CODE_SET** - Add, modify, or delete a user code
  - User Identifier: 1-30
  - User ID Status: Available (0x00), Occupied (0x01), Reserved (0x02), Status not available (0xFE)
  - User Code: 4-8 digits (typically 4-6 for BE469)
- **USER_CODE_GET** - Request information about a specific user code slot
  - User Identifier: 1-30
- **USER_CODE_REPORT** - Returns user code information
  - Does not return the actual code for security reasons
  - Returns slot status (available, occupied, reserved)
- **USERS_NUMBER_GET** - Request total number of supported user codes
- **USERS_NUMBER_REPORT** - Returns maximum supported user codes (30)

#### User Code Slots
- **Slot 1-30**: User access codes
- **Master Code**: Programmed via keypad (not via Z-Wave)

#### Important Security Behavior

**User codes are write-only** - For security, the lock returns masked values (`**********`) when querying codes via `USER_CODE_GET`. The actual PIN values cannot be read back from the lock.

**Duplicate code rejection** - The Schlage BE469 silently rejects duplicate codes:
- When setting a code that already exists in another slot, the lock accepts the `USER_CODE_SET` command without error
- However, verification shows the target slot remains at status `0x00` (Available) instead of `0x01` (Occupied)
- The code is NOT programmed to the requested slot
- There is no explicit error response or notification
- Since codes cannot be read back, it's impossible to scan all slots to check for duplicates beforehand
- **Application layer must track which codes are assigned to prevent duplicates**

**Other silent rejection reasons:**
- Code violates lock's internal complexity rules (e.g., too simple like "1111")
- EEPROM full or corrupted
- Code format issues

**Best practices:**
1. Use `userIdStatus: 0x01` (Occupied) when setting codes, not `0x00` (Available)
2. After `USER_CODE_SET`, always verify by querying the slot with `USER_CODE_GET`
3. Success = `userIdStatus: 0x01` in verification response
4. Failure = `userIdStatus: 0x00` (slot unchanged) - code was rejected
5. Maintain a database of assigned codes to prevent duplicates

---

### Alarm (0x71) / Notification (0x71 v3+)
Reports lock events, alarms, and notifications.

#### Alarm Types & Events

**Access Control (0x06)**
- Manual lock operation (0x01)
- Manual unlock operation (0x02)
- RF lock operation (0x03)
- RF unlock operation (0x04)
- Keypad lock operation (0x05) - includes user ID
- Keypad unlock operation (0x06) - includes user ID
- Manual not fully locked operation (0x07)
- RF not fully locked operation (0x08)
- Auto lock locked operation (0x09)
- Auto lock not fully locked (0x0A)
- Lock jammed (0x0B)
- All user codes deleted (0x0C)
- Single user code deleted (0x0D)
- New user code added (0x0E)
- New user code not added (duplicate) (0x0F)
- Keypad temporary disabled (0x10)
- Keypad busy (0x11)
- New program code entered (0x12)
- Manually enter user code exceeds limit (0x13)
- Unlock by RF wrong code (0x14)
- Locked by RF wrong code (0x15)
- Window/door is open (0x16)
- Window/door is closed (0x17)

**Home Security (0x07)**
- Tampering, product cover removed (0x03)
- Invalid code (0x06)
- Tamper alarm - wrong code entry limit (0x09)

**Power Management (0x08)**
- Replace battery soon (0x0A)
- Replace battery now (0x0B)

#### Commands
- **ALARM_GET** - Request alarm/notification status
  - Alarm Type
  - Notification Type (for v3+)
- **ALARM_REPORT** / **NOTIFICATION_REPORT** - Returns alarm information
  - Alarm Type
  - Alarm Level
  - Notification Status
  - Notification Type
  - Event
  - Event Parameters (e.g., User ID)
  - Sequence Number

---

### Battery (0x80)
Monitors battery level.

#### Commands
- **BATTERY_GET** - Request current battery level
- **BATTERY_REPORT** - Returns battery status
  - Battery Level: 0-100% (0x00-0x64)
  - 0xFF = Low battery warning

#### Battery Information
- Type: 4x AA batteries
- Typical life: 1+ years depending on usage
- Low battery threshold: ~20%
- Critical battery: <10%

---

### Association (0x85)
Manages association groups for reporting.

#### Commands
- **ASSOCIATION_SET** - Add node to association group
- **ASSOCIATION_GET** - Request association group members
- **ASSOCIATION_REPORT** - Returns group members
- **ASSOCIATION_REMOVE** - Remove node from group
- **ASSOCIATION_GROUPINGS_GET** - Request number of groups
- **ASSOCIATION_GROUPINGS_REPORT** - Returns number of groups

#### Association Groups
- **Group 1 (Lifeline)**: Sends all notifications, battery reports, and lock status to controller
  - Max nodes: 1 (controller only)

---

### Version (0x86)
Retrieves firmware and command class version information.

#### Commands
- **VERSION_GET** - Request firmware version
- **VERSION_REPORT** - Returns version information
  - Z-Wave Library Type
  - Z-Wave Protocol Version
  - Application Version
  - Application Sub Version
- **VERSION_COMMAND_CLASS_GET** - Request specific command class version
- **VERSION_COMMAND_CLASS_REPORT** - Returns command class version

---

### Manufacturer Specific (0x72)
Provides manufacturer identification.

#### Commands
- **MANUFACTURER_SPECIFIC_GET** - Request manufacturer information
- **MANUFACTURER_SPECIFIC_REPORT** - Returns manufacturer data
  - Manufacturer ID: 0x003B (Allegion)
  - Product Type ID: 0x6341
  - Product ID: 0x5044 (varies by model)

---

### Configuration (0x70)
Configures device-specific parameters.

#### Commands
- **CONFIGURATION_SET** - Set configuration parameter
- **CONFIGURATION_GET** - Request parameter value
- **CONFIGURATION_REPORT** - Returns parameter value

#### Configuration Parameters
- **Parameter 3**: Beeper (0x00 = Disabled, 0xFF = Enabled)
- **Parameter 4**: Vacation Mode (0x00 = Disabled, 0xFF = Enabled)
- **Parameter 5**: Lock & Leave (0x00 = Disabled, 0xFF = Enabled)
- **Parameter 7**: Alarm Mode (0x00 = Off, 0x01 = Alert, 0x02 = Tamper, 0x03 = Forced Entry)
- **Parameter 8**: Alarm Sensitivity (0x01-0x05, 0x03 = Medium/Default)
- **Parameter 9**: Alarm Duration (0x01-0xFF seconds)
- **Parameter 15**: Auto Lock (0x00 = Disabled, 0xFF = Enabled)
- **Parameter 16**: User Code Length (4-8 digits)

---

## Retrievable Metrics & Information

### Real-Time Status
| Metric | Command Class | Description |
|--------|--------------|-------------|
| Lock State | Door Lock (0x62) | Current locked/unlocked status |
| Battery Level | Battery (0x80) | Percentage remaining (0-100%) |
| Door Status | Door Lock (0x62) | Open/closed if sensor equipped |
| Lock Bolt Status | Door Lock (0x62) | Extended/retracted |

### Historical Events
| Event | Command Class | Information Provided |
|-------|--------------|---------------------|
| Last User Code Used | Alarm (0x71) | User ID (slot 1-30) |
| Lock Method | Alarm (0x71) | Keypad, RF, Manual, Auto |
| Unlock Method | Alarm (0x71) | Keypad, RF, Manual |
| Invalid Code Attempts | Alarm (0x71) | Count and timestamp |
| Tamper Events | Alarm (0x71) | Cover removal, force |
| Battery Warnings | Alarm (0x71) | Low/critical alerts |

### Configuration Status
| Setting | Command Class | Values |
|---------|--------------|--------|
| Auto-Lock Enabled | Configuration (0x70) | Yes/No |
| Auto-Lock Timeout | Door Lock (0x62) | Seconds |
| Beeper Status | Configuration (0x70) | On/Off |
| Vacation Mode | Configuration (0x70) | On/Off |
| Alarm Mode | Configuration (0x70) | Off/Alert/Tamper/Forced Entry |
| User Code Slots Used | User Code (0x63) | Count (0-30) |

### Device Information
| Info | Command Class | Details |
|------|--------------|---------|
| Firmware Version | Version (0x86) | Application version |
| Manufacturer | Manufacturer Specific (0x72) | Allegion (0x003B) |
| Product Type | Manufacturer Specific (0x72) | Model identifier |
| Z-Wave Protocol | Version (0x86) | Protocol version |

---

## Common Use Cases

### 1. Lock the Door
```
Command: DOOR_LOCK_OPERATION_SET
Value: 0xFF (Secured)
```

### 2. Unlock the Door
```
Command: DOOR_LOCK_OPERATION_SET
Value: 0x00 (Unsecured)
```

### 3. Check Lock Status
```
Command: DOOR_LOCK_OPERATION_GET
Response: DOOR_LOCK_OPERATION_REPORT
Returns: Current lock state
```

### 4. Check Battery Level
```
Command: BATTERY_GET
Response: BATTERY_REPORT
Returns: 0-100% or 0xFF for low battery
```

### 5. Add User Code
```
Command: USER_CODE_SET
Parameters:
  - User ID: 1-30
  - Status: 0x01 (Occupied)
  - Code: 4-8 digit PIN
```

### 6. Delete User Code
```
Command: USER_CODE_SET
Parameters:
  - User ID: 1-30
  - Status: 0x00 (Available)
  - Code: 0x00 (empty)
```

### 7. Enable Auto-Lock
```
Command: CONFIGURATION_SET
Parameter: 15
Value: 0xFF (Enabled)
```

### 8. Check Last User
```
Listen for: ALARM_REPORT / NOTIFICATION_REPORT
Event Type: Access Control (0x06)
Event: Keypad unlock (0x06)
Event Parameters: User ID who unlocked
```

### 9. Monitor Tamper Events
```
Listen for: ALARM_REPORT
Alarm Type: Home Security (0x07)
Event: Tampering (0x03) or Invalid Code (0x06)
```

### 10. Check Firmware Version
```
Command: VERSION_GET
Response: VERSION_REPORT
Returns: Firmware version and Z-Wave library info
```

---

## Event Flow Examples

### Keypad Unlock Event
1. User enters valid code on keypad
2. Lock unlocks
3. Lock sends ALARM_REPORT/NOTIFICATION_REPORT:
   - Notification Type: Access Control (0x06)
   - Event: Keypad unlock operation (0x06)
   - Event Parameter: User ID (slot number)
4. Lock sends DOOR_LOCK_OPERATION_REPORT:
   - Lock Mode: Unsecured (0x00)

### Low Battery Event
1. Battery level drops below threshold
2. Lock sends ALARM_REPORT:
   - Alarm Type: Power Management (0x08)
   - Event: Replace battery soon (0x0A)
3. Lock sends BATTERY_REPORT:
   - Battery Level: <20% or 0xFF

### Invalid Code Event
1. User enters incorrect code 3+ times
2. Lock sends ALARM_REPORT:
   - Alarm Type: Home Security (0x07)
   - Event: Invalid code (0x06)
3. Keypad may be temporarily disabled

---

## Notes

- **Security**: The BE469 supports **Z-Wave Security S0 only** (NOT S2). All commands should be sent using S0 encryption.
  - Uses 128-bit AES encryption
  - Must be included with secure inclusion/pairing
  - S0 is sufficient for residential lock security
  - Newer models (Encode Plus) support S2 if needed
  - Z-Wave chip: 500 series Z-Wave Plus (no S2 support)
- **User Codes**: Actual PIN codes cannot be retrieved via Z-Wave for security reasons.
- **Timing**: Some operations may take 1-3 seconds to complete.
- **Battery**: Regular battery monitoring is recommended to prevent lockouts.
- **Auto-Lock**: When enabled, the lock will automatically re-lock after the configured timeout.
- **Master Code**: Set via keypad, not accessible via Z-Wave.
- **Range**: Typical Z-Wave range is 30-100 feet, but can be affected by walls and interference.

---

## Factory Reset & Z-Wave Exclusion

### Z-Wave Exclusion (Recommended Method)
To remove the lock from your Z-Wave network without deleting user codes:

1. **Put your Z-Wave controller into Exclusion Mode**
   - This varies by controller/hub (consult your controller's documentation)
   - Also called "Remove Device" or "Unpair Device" mode

2. **On the BE469 Lock:**
   - Press the **Schlage button** (the button with the Schlage logo)
   - Enter your **6-digit Programming Code** (default from installation)
   - Press **Schlage button** again
   - Press **0** (zero)
   - The lock will beep and the Schlage button will flash green if successful

3. **Confirmation**
   - Your controller should confirm the device has been excluded
   - The lock is now ready to be included in a new network
   - All user codes remain intact

### Factory Default Reset (Complete Reset)
**WARNING:** This will delete ALL user codes, programming code, and Z-Wave settings. You will need to reprogram everything.

**Method 1: Using Programming Code**
1. Remove the battery cover
2. Press and hold the **Schlage button** while reinserting the battery pack
3. Continue holding for approximately 10 seconds until the Schlage button flashes orange
4. Release the button
5. The lock will flash green, then red, indicating factory reset is complete
6. All codes deleted, lock restored to factory defaults

**Method 2: Physical Reset Button (if available)**
1. Remove the battery cover and batteries
2. Locate the small reset button on the interior assembly (near battery compartment)
3. Press and hold the reset button
4. Reinsert batteries while holding the reset button
5. Continue holding for 10 seconds
6. Release when the Schlage button flashes
7. Lock is now at factory defaults

### Re-Inclusion (Adding Back to Z-Wave Network)

After exclusion or factory reset, to add the lock back to your Z-Wave network:

1. **Put your Z-Wave controller into Inclusion Mode**
   - Also called "Add Device" or "Pair Device" mode

2. **On the BE469 Lock:**
   - Press the **Schlage button**
   - Enter your **6-digit Programming Code**
   - Press **Schlage button** again
   - Press **0** (zero)
   - The lock will beep and flash green if pairing is successful

3. **Wait for Configuration**
   - The controller may take 30-60 seconds to fully configure the lock
   - The lock will appear in your controller's device list
   - Test basic lock/unlock commands before programming user codes

### After Factory Reset - Initial Setup

1. **Set a new Programming Code** (6 digits)
   - Press Schlage button
   - Enter default programming code (usually on installation card or "0-0-0-0-0-0")
   - Enter new 6-digit programming code
   - Re-enter to confirm

2. **Add User Codes**
   - Can be done via keypad or Z-Wave (USER_CODE_SET command)
   - Supports 30 user codes

3. **Configure Settings**
   - Auto-lock timeout
   - Beeper on/off
   - Alarm settings
   - Lock & Leave mode

### Troubleshooting Reset Issues

**Lock won't exclude:**
- Ensure controller is in exclusion mode
- Try moving controller closer to lock
- Verify batteries are fresh (>50%)
- Some locks require general exclusion (not specific to original controller)

**Factory reset not completing:**
- Ensure batteries are fresh
- Make sure you're holding button for full 10 seconds
- Try removing batteries for 30 seconds before attempting reset

**Can't re-include after reset:**
- Perform exclusion first (even if lock shows as excluded)
- General exclusion can help clear ghost Z-Wave settings
- Ensure lock is within range of controller
- Check if controller has device limit reached

### Important Notes

- **Exclusion vs. Factory Reset**: Exclusion removes Z-Wave connection but keeps user codes. Factory reset erases everything.
- **Security**: The BE469 only supports S0 security (not S2). Always use secure inclusion (S0) for lock devices.
- **Programming Code**: Write down your new programming code - it's needed for all keypad programming
- **Backup Codes**: Keep a record of user codes before factory reset
- **Re-interview**: After re-inclusion, some controllers require "re-interviewing" the device to discover all command classes

---

## References

- Z-Wave Alliance Device Database
- Schlage BE469 Installation Manual
- Z-Wave Command Class Specification
- Allegion Technical Documentation
