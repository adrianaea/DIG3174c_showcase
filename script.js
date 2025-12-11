let activeWindow = null;
let isDragging = false;
let isResizing = false;
let resizeDirection = null;
let dragOffset = { x: 0, y: 0 };
let zIndexCounter = 1000;
let resizeStartBounds = null;
let resizeStartMouse = null;

// Update clock
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    document.querySelector('.clock').textContent = timeString;
}

updateClock();
setInterval(updateClock, 1000);

// Desktop icon click handlers
document.querySelectorAll('.desktop-icon').forEach(icon => {
    icon.addEventListener('dblclick', function() {
        const windowId = this.dataset.window;
        openWindow(windowId);
    });
});

function openWindow(windowId) {
    const window = document.getElementById(windowId);
    const taskbar = document.querySelector('.taskbar-tasks');
    
    if (window.style.display === 'none' || !window.style.display) {
        window.style.display = 'block';
        window.classList.add('opening');
        
        // Position window with slight offset if multiple windows are open
        const openWindows = document.querySelectorAll('.window[style*="block"]').length;
        window.style.left = (50 + (openWindows * 30)) + 'px';
        window.style.top = (50 + (openWindows * 30)) + 'px';
        window.style.width = '850px';
        window.style.height = '600px';
        
        // Create taskbar button
        const taskButton = document.createElement('div');
        taskButton.className = 'task-button';
        taskButton.textContent = window.querySelector('.window-title').textContent.trim();
        taskButton.dataset.window = windowId;
        taskbar.appendChild(taskButton);
        
        // Task button click handler
        taskButton.addEventListener('click', function() {
            if (window.style.display === 'none') {
                window.style.display = 'block';
                this.classList.add('active');
            } else {
                focusWindow(windowId);
            }
        });
        
        focusWindow(windowId);
        
        setTimeout(() => {
            window.classList.remove('opening');
        }, 300);
    } else {
        focusWindow(windowId);
    }
}

function focusWindow(windowId) {
    // Remove active class from all windows and task buttons
    document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
    document.querySelectorAll('.task-button').forEach(b => b.classList.remove('active'));
    
    // Add active class to current window and task button
    const window = document.getElementById(windowId);
    window.classList.add('active');
    window.style.zIndex = ++zIndexCounter;
    
    const taskButton = document.querySelector(`[data-window="${windowId}"]`);
    if (taskButton && taskButton.classList.contains('task-button')) {
        taskButton.classList.add('active');
    }
    
    activeWindow = windowId;
}

function closeWindow(windowId) {
    const window = document.getElementById(windowId);
    const taskButton = document.querySelector(`.task-button[data-window="${windowId}"]`);
    
    window.style.display = 'none';
    if (taskButton) {
        taskButton.remove();
    }
    
    if (activeWindow === windowId) {
        activeWindow = null;
    }
}

// Window control handlers
document.querySelectorAll('.window').forEach(window => {
    const header = window.querySelector('.window-header');
    const closeBtn = window.querySelector('.close');
    const minimizeBtn = window.querySelector('.minimize');
    const maximizeBtn = window.querySelector('.maximize');
    const resizeHandles = window.querySelectorAll('.resize-handle');
    
    // Close button
    closeBtn.addEventListener('click', function() {
        closeWindow(window.id);
    });
    
    // Minimize button
    minimizeBtn.addEventListener('click', function() {
        window.style.display = 'none';
        document.querySelector(`.task-button[data-window="${window.id}"]`).classList.remove('active');
    });
    
    // Maximize button (simple toggle)
    maximizeBtn.addEventListener('click', function() {
        if (window.style.width === '100vw') {
            window.style.width = '600px';
            window.style.height = '400px';
            window.style.left = '50px';
            window.style.top = '50px';
        } else {
            window.style.width = '100vw';
            window.style.height = 'calc(100vh - 30px)';
            window.style.left = '0';
            window.style.top = '0';
        }
    });
    
    // Focus window on click
    window.addEventListener('mousedown', function() {
        focusWindow(window.id);
    });
    
    // Resize handle event listeners
    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            isResizing = true;
            resizeDirection = this.classList[1]; // nw, n, ne, e, se, s, sw, w
            
            focusWindow(window.id);
            
            // Capture mouse to prevent interference from other elements
            if (this.setPointerCapture && e.pointerId) {
                this.setPointerCapture(e.pointerId);
            }
            
            const rect = window.getBoundingClientRect();
            resizeStartBounds = {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            };
            
            resizeStartMouse = {
                x: e.clientX,
                y: e.clientY
            };
            
            // Add event listeners to document to ensure we catch all mouse events
            document.addEventListener('mousemove', resizeWindow, true);
            document.addEventListener('mouseup', stopResizing, true);
            
            // Disable text selection and other interactions during resize
            document.body.style.userSelect = 'none';
            document.body.style.pointerEvents = 'none';
            window.style.pointerEvents = 'auto';
        });
    });
    
    // Drag functionality
    header.addEventListener('mousedown', function(e) {
        // Don't start dragging if we're clicking on window controls or if resizing is active
        if (e.target.classList.contains('window-button') || isResizing) return;
        
        e.preventDefault();
        isDragging = true;
        focusWindow(window.id);
        
        const rect = window.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        document.addEventListener('mousemove', dragWindow, true);
        document.addEventListener('mouseup', stopDragging, true);
        
        // Disable text selection during drag
        document.body.style.userSelect = 'none';
    });
});

function resizeWindow(e) {
    if (!isResizing || !activeWindow || !resizeDirection) return;
    
    const window = document.getElementById(activeWindow);
    const deltaX = e.clientX - resizeStartMouse.x;
    const deltaY = e.clientY - resizeStartMouse.y;
    
    let newLeft = resizeStartBounds.left;
    let newTop = resizeStartBounds.top;
    let newWidth = resizeStartBounds.width;
    let newHeight = resizeStartBounds.height;
    
    // Handle different resize directions
    switch(resizeDirection) {
        case 'nw': // North-West
            newLeft += deltaX;
            newTop += deltaY;
            newWidth -= deltaX;
            newHeight -= deltaY;
            break;
        case 'n': // North
            newTop += deltaY;
            newHeight -= deltaY;
            break;
        case 'ne': // North-East
            newTop += deltaY;
            newWidth += deltaX;
            newHeight -= deltaY;
            break;
        case 'e': // East
            newWidth += deltaX;
            break;
        case 'se': // South-East
            newWidth += deltaX;
            newHeight += deltaY;
            break;
        case 's': // South
            newHeight += deltaY;
            break;
        case 'sw': // South-West
            newLeft += deltaX;
            newWidth -= deltaX;
            newHeight += deltaY;
            break;
        case 'w': // West
            newLeft += deltaX;
            newWidth -= deltaX;
            break;
    }
    
    // Enforce minimum dimensions
    if (newWidth < 300) {
        if (resizeDirection.includes('w')) {
            newLeft = resizeStartBounds.left + resizeStartBounds.width - 300;
        }
        newWidth = 300;
    }
    
    if (newHeight < 200) {
        if (resizeDirection.includes('n')) {
            newTop = resizeStartBounds.top + resizeStartBounds.height - 200;
        }
        newHeight = 200;
    }
    
    // Apply constraints to keep window on screen
    newLeft = Math.max(0, Math.min(newLeft, window.offsetParent.clientWidth - newWidth));
    newTop = Math.max(0, Math.min(newTop, window.offsetParent.clientHeight - newHeight - 30));
    
    // Apply the new dimensions and position
    window.style.left = newLeft + 'px';
    window.style.top = newTop + 'px';
    window.style.width = newWidth + 'px';
    window.style.height = newHeight + 'px';
}

function stopResizing() {
    if (!isResizing) return;
    
    isResizing = false;
    resizeDirection = null;
    resizeStartBounds = null;
    resizeStartMouse = null;
    
    // Remove event listeners with capture flag
    document.removeEventListener('mousemove', resizeWindow, true);
    document.removeEventListener('mouseup', stopResizing, true);
    
    // Restore normal interaction
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';
    
    // Restore pointer events for all windows
    document.querySelectorAll('.window').forEach(w => {
        w.style.pointerEvents = '';
    });
}

function dragWindow(e) {
    if (!isDragging || !activeWindow) return;
    
    const window = document.getElementById(activeWindow);
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    window.style.left = Math.max(0, Math.min(newX, window.offsetParent.clientWidth - window.offsetWidth)) + 'px';
    window.style.top = Math.max(0, Math.min(newY, window.offsetParent.clientHeight - window.offsetHeight - 30)) + 'px';
}

function stopDragging() {
    if (!isDragging) return;
    
    isDragging = false;
    document.removeEventListener('mousemove', dragWindow, true);
    document.removeEventListener('mouseup', stopDragging, true);
    
    // Restore text selection
    document.body.style.userSelect = '';
}

// Prevent text selection while dragging or resizing
document.addEventListener('selectstart', function(e) {
    if (isDragging || isResizing) {
        e.preventDefault();
    }
});