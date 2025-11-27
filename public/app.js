// Configuration
// Use current hostname (works for both localhost and remote access)
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000`;
const MAX_EVENTS = 20;

// State
let selectedNodeId = parseInt(localStorage.getItem('selectedNodeId')) || null;
let eventSource = null;
let lockState = 'unknown';
let batteryLevel = null;
let events = [];
let availableNodes = [];
let lockCodeLength = null; // Store the lock's configured code length

// DOM Elements
const nodeSelector = document.getElementById('node-selector');
const nodeSelect = document.getElementById('node-select');
const mainContent = document.getElementById('main-content');
const lockStatus = document.getElementById('lock-status');
const lockIcon = lockStatus.querySelector('.lock-icon');
const lockStateText = lockStatus.querySelector('.lock-state');
const btnLock = document.getElementById('btn-lock');
const btnUnlock = document.getElementById('btn-unlock');
const batteryFill = document.getElementById('battery-fill');
const batteryPercent = document.getElementById('battery-percent');
const eventList = document.getElementById('event-list');
const connectionStatus = document.getElementById('connection-status');
const statusDot = connectionStatus.querySelector('.status-dot');
const statusText = connectionStatus.querySelector('.status-text');

// Initialize
async function init() {
  // Fetch available nodes
  await fetchNodes();
  
  // Set up node selector
  nodeSelect.addEventListener('change', onNodeSelected);
  
  // If we have a saved node, select it
  if (selectedNodeId) {
    nodeSelect.value = selectedNodeId;
    await onNodeSelected();
  }
}

// Fetch available nodes
async function fetchNodes() {
  try {
    const response = await fetch(`${API_BASE_URL}/nodes`);
    const data = await response.json();
    availableNodes = data.nodes || [];
    
    // Filter out the controller node (node 1) - only show locks
    const lockNodes = availableNodes.filter(node => node.id !== 1);
    
    // Populate dropdown
    nodeSelect.innerHTML = '<option value="">-- Select a lock --</option>';
    
    lockNodes.forEach(node => {
      const option = document.createElement('option');
      option.value = node.id;
      
      // Use friendly name if node 8, otherwise show node description
      let displayName;
      if (node.id === 8) {
        displayName = 'Front Door - Deadbolt';
      } else {
        displayName = node.description || node.label || `Lock ${node.id}`;
      }
      
      option.textContent = displayName;
      nodeSelect.appendChild(option);
    });
    
  } catch (error) {
    console.error('Failed to fetch nodes:', error);
    nodeSelect.innerHTML = '<option value="">Error loading nodes</option>';
  }
}

// Handle node selection
async function onNodeSelected() {
  const nodeId = parseInt(nodeSelect.value);
  
  if (!nodeId) {
    mainContent.style.display = 'none';
    return;
  }
  
  selectedNodeId = nodeId;
  localStorage.setItem('selectedNodeId', nodeId);
  
  // Show main content
  mainContent.style.display = 'block';
  
  // Reset state to unknown while loading
  updateLockState('unknown');
  updateBattery(0);
  
  // Disconnect existing event stream
  if (eventSource) {
    eventSource.close();
  }
  
  // Fetch initial status
  await fetchStatus();
  
  // Connect to event stream
  connectEventStream();
  
  // Set up button handlers (remove old ones first)
  btnLock.replaceWith(btnLock.cloneNode(true));
  btnUnlock.replaceWith(btnUnlock.cloneNode(true));
  
  const newBtnLock = document.getElementById('btn-lock');
  const newBtnUnlock = document.getElementById('btn-unlock');
  
  newBtnLock.addEventListener('click', lockDoor);
  newBtnUnlock.addEventListener('click', unlockDoor);
}

// Fetch current lock status
async function fetchStatus() {
  if (!selectedNodeId) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/nodes/${selectedNodeId}/status`);
    const data = await response.json();
    
    if (data.lockState) {
      updateLockState(data.lockState);
    }
    
    if (data.battery !== null && data.battery !== undefined) {
      updateBattery(data.battery);
    }
  } catch (error) {
    console.error('Failed to fetch status:', error);
    addEvent('Error', 'Failed to fetch lock status', 'error');
  }
}

// Fetch lock's configured code length
async function fetchCodeLength() {
  if (!selectedNodeId) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/nodes/${selectedNodeId}/code-length`);
    const data = await response.json();
    
    if (data.codeLength) {
      lockCodeLength = data.codeLength;
      console.log(`Lock configured for ${lockCodeLength}-digit codes`);
    } else {
      lockCodeLength = null;
    }
  } catch (error) {
    console.error('Failed to fetch code length:', error);
    lockCodeLength = null;
  }
}

// Connect to Server-Sent Events stream
function connectEventStream() {
  if (!selectedNodeId) return;
  
  // Close existing connection if any
  if (eventSource) {
    eventSource.close();
  }
  
  updateConnectionStatus('connecting');
  
  eventSource = new EventSource(`${API_BASE_URL}/nodes/${selectedNodeId}/events`);
  
  eventSource.onopen = () => {
    console.log('SSE connection established');
    updateConnectionStatus('connected');
  };
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleEvent(data);
    } catch (error) {
      console.error('Failed to parse event:', error);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    updateConnectionStatus('disconnected');
    
    // Reconnect after 5 seconds
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      connectEventStream();
    }, 5000);
  };
}

// Handle incoming events
function handleEvent(data) {
  console.log('Event received:', data);
  
  switch (data.type) {
    case 'connected':
      addEvent('System', 'Connected to lock', 'info');
      break;
      
    case 'value-updated':
      handleValueUpdate(data);
      break;
      
    case 'notification':
      handleNotification(data);
      break;
  }
}

// Handle value update events
function handleValueUpdate(data) {
  const { property, value, commandClass } = data;
  
  // Lock state changes
  if (commandClass === 'Door Lock' && property === 'currentMode') {
    const state = value === 255 ? 'locked' : value === 0 ? 'unlocked' : 'unknown';
    updateLockState(state);
    
    const action = state === 'locked' ? 'locked' : 'unlocked';
    addEvent('Lock', `Door ${action}`, 'lock');
  }
  
  // Battery level changes
  if (commandClass === 'Battery' && property === 'level') {
    updateBattery(value);
    addEvent('Battery', `Battery level: ${value}%`, 'battery');
  }
}

// Handle notification events
function handleNotification(data) {
  const { commandClass, parameters } = data;
  
  console.log('Notification:', commandClass, parameters);
  
  // You can add more specific notification handling here
  // For example, user code usage, tamper alerts, etc.
  addEvent('Notification', JSON.stringify(parameters), 'notification');
}

// Update lock state UI
function updateLockState(state) {
  lockState = state;
  
  lockStatus.classList.remove('locked', 'unlocked');
  
  if (state === 'locked') {
    lockStatus.classList.add('locked');
    lockIcon.textContent = '🔒';
    lockStateText.textContent = 'Locked';
  } else if (state === 'unlocked') {
    lockStatus.classList.add('unlocked');
    lockIcon.textContent = '🔓';
    lockStateText.textContent = 'Unlocked';
  } else {
    lockIcon.textContent = '❓';
    lockStateText.textContent = 'Unknown';
  }
}

// Update battery UI
function updateBattery(level) {
  batteryLevel = level;
  batteryFill.style.width = `${level}%`;
  batteryPercent.textContent = `${level}%`;
  
  // Update battery color based on level
  batteryFill.classList.remove('low', 'critical');
  if (level < 20) {
    batteryFill.classList.add('critical');
  } else if (level < 40) {
    batteryFill.classList.add('low');
  }
}

// Update connection status
function updateConnectionStatus(status) {
  statusDot.classList.remove('connected');
  
  if (status === 'connected') {
    statusDot.classList.add('connected');
    statusText.textContent = 'Connected';
  } else if (status === 'connecting') {
    statusText.textContent = 'Connecting...';
  } else {
    statusText.textContent = 'Disconnected';
  }
}

// Lock door
async function lockDoor() {
  if (!selectedNodeId) return;
  
  const btn = document.getElementById('btn-lock');
  btn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE_URL}/nodes/${selectedNodeId}/lock`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to lock door');
    }
    
    // Update UI with returned state
    if (data.state) {
      updateLockState(data.state);
    }
    
    addEvent('Command', 'Lock command sent', 'command');
  } catch (error) {
    console.error('Failed to lock door:', error);
    addEvent('Error', error.message || 'Failed to send lock command', 'error');
  } finally {
    setTimeout(() => {
      const btn = document.getElementById('btn-lock');
      if (btn) btn.disabled = false;
    }, 1000);
  }
}

// Unlock door
async function unlockDoor() {
  if (!selectedNodeId) return;
  
  const btn = document.getElementById('btn-unlock');
  btn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE_URL}/nodes/${selectedNodeId}/unlock`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to unlock door');
    }
    
    // Update UI with returned state
    if (data.state) {
      updateLockState(data.state);
    }
    
    addEvent('Command', 'Unlock command sent', 'command');
  } catch (error) {
    console.error('Failed to unlock door:', error);
    addEvent('Error', error.message || 'Failed to send unlock command', 'error');
  } finally {
    setTimeout(() => {
      const btn = document.getElementById('btn-unlock');
      if (btn) btn.disabled = false;
    }, 1000);
  }
}

// Add event to log
function addEvent(category, message, type = 'info') {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  const date = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  const event = {
    category,
    message,
    type,
    time,
    date,
    timestamp: now
  };
  
  events.unshift(event);
  
  // Keep only MAX_EVENTS
  if (events.length > MAX_EVENTS) {
    events = events.slice(0, MAX_EVENTS);
  }
  
  renderEvents();
}

// Render event list
function renderEvents() {
  if (events.length === 0) {
    eventList.innerHTML = '<div class="event-item placeholder">Waiting for events...</div>';
    return;
  }
  
  eventList.innerHTML = events.map((event, index) => `
    <div class="event-item ${index === 0 ? 'new' : ''}">
      <div class="event-time">${event.time} • ${event.date}</div>
      <div class="event-message"><strong>${event.category}:</strong> ${event.message}</div>
    </div>
  `).join('');
}

// User codes management removed - use CLI for code management

// Initialize code management
function initCodeManagement() {
  btnAddCode.addEventListener('click', () => openCodeModal());
  btnCancel.addEventListener('click', closeCodeModal);
  modalClose.addEventListener('click', closeCodeModal);
  codeForm.addEventListener('submit', handleCodeSubmit);
  
  // Close modal on outside click
  codeModal.addEventListener('click', (e) => {
    if (e.target === codeModal) {
      closeCodeModal();
    }
  });
}

// Fetch user codes
async function fetchUserCodes() {
  if (!selectedNodeId) return;
  
  try {
    codesList.innerHTML = '<div class="loading">Loading codes from lock...</div>';
    
    const response = await fetch(`${API_BASE_URL}/nodes/${selectedNodeId}/user-codes`);
    const data = await response.json();
    
    userCodes = data.codes || [];
    renderUserCodes();
  } catch (error) {
    console.error('Failed to fetch user codes:', error);
    codesList.innerHTML = '<div class="loading">Failed to load codes</div>';
  }
}

// Render user codes list
function renderUserCodes() {
  if (userCodes.length === 0) {
    codesList.innerHTML = '<div class="loading">No access codes configured</div>';
    return;
  }
  
  codesList.innerHTML = userCodes.map(code => `
    <div class="code-item">
      <div class="code-info">
        <div class="code-name">${code.name || 'Unnamed'}</div>
        <div class="code-slot">Slot ${code.slot}</div>
      </div>
      <div class="code-actions">
        <button class="btn btn-icon-only btn-delete" onclick="deleteUserCode(${code.slot})">🗑️</button>
      </div>
    </div>
  `).join('');
}

// Open add/edit code modal
function openCodeModal(slot = null) {
  isEditMode = slot !== null;
  editingSlot = slot;
  
  // Update code length hint if we know it
  const codeLengthHint = document.getElementById('code-length-hint');
  const codePinInput = document.getElementById('code-pin');
  if (lockCodeLength) {
    codeLengthHint.textContent = `Must be exactly ${lockCodeLength} digits`;
    codePinInput.pattern = `[0-9]{${lockCodeLength}}`;
    codePinInput.placeholder = '0'.repeat(lockCodeLength);
  } else {
    codeLengthHint.textContent = 'Enter 4-8 digit code';
    codePinInput.pattern = '[0-9]{4,8}';
    codePinInput.placeholder = 'Enter PIN';
  }
  
  if (isEditMode) {
    modalTitle.textContent = 'Edit Access Code';
    const code = userCodes.find(c => c.slot === slot);
    if (code) {
      document.getElementById('code-name').value = code.name || '';
      document.getElementById('code-slot').value = slot;
      document.getElementById('code-slot').disabled = true;
    }
  } else {
    modalTitle.textContent = 'Add Access Code';
    codeForm.reset();
    document.getElementById('code-slot').disabled = false;
    populateSlotOptions();
  }
  
  codeModal.style.display = 'flex';
}

// Close code modal
function closeCodeModal() {
  codeModal.style.display = 'none';
  codeForm.reset();
  isEditMode = false;
  editingSlot = null;
}

// Populate slot dropdown
function populateSlotOptions() {
  const usedSlots = userCodes.map(c => c.slot);
  const availableSlots = [];
  
  for (let i = 1; i <= 30; i++) {
    if (!usedSlots.includes(i)) {
      availableSlots.push(i);
    }
  }
  
  codeSlotSelect.innerHTML = availableSlots.map(slot => 
    `<option value="${slot}">Slot ${slot}</option>`
  ).join('');
  
  if (availableSlots.length === 0) {
    codeSlotSelect.innerHTML = '<option value="">No slots available</option>';
    btnSaveCode.disabled = true;
  } else {
    btnSaveCode.disabled = false;
  }
}

// Note: Code setting removed - use CLI for admin functions

async function handleCodeSubmit(e) {
  e.preventDefault();
  addEvent('Error', 'Code setting disabled - use CLI to add codes', 'error');
  closeCodeModal();
}

// Delete user code
async function deleteUserCode(slot) {
  const code = userCodes.find(c => c.slot === slot);
  const name = code?.name || `Slot ${slot}`;
  
  if (!confirm(`Delete access code for ${name}?`)) {
    return;
  }
  
  try {
    // Show loading state
    codesList.innerHTML = '<div class="loading">Removing code from lock...</div>';
    
    const response = await fetch(`${API_BASE_URL}/nodes/${selectedNodeId}/user-codes/${slot}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      addEvent('Code Deleted', `Access code for ${name} removed`, 'success');
      // Use returned codes instead of re-fetching
      if (data.codes) {
        userCodes = data.codes;
        renderUserCodes();
      }
    } else {
      addEvent('Error', data.error || 'Failed to delete code', 'error');
      renderUserCodes(); // Restore previous view
    }
  } catch (error) {
    console.error('Failed to delete code:', error);
    addEvent('Error', 'Failed to delete access code', 'error');
    renderUserCodes(); // Restore previous view
  }
}

// Make deleteUserCode globally accessible
window.deleteUserCode = deleteUserCode;

// Start the app
init();
initCodeManagement();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (eventSource) {
    eventSource.close();
  }
});
