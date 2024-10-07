(function(window) {
    var alertContainer;
    
    function createAlertContainer() {
        // Create a container if it doesn't already exist
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'alertContainer';
            alertContainer.style.position = 'fixed';
            alertContainer.style.top = '20px';
            alertContainer.style.right = '20px';
            alertContainer.style.zIndex = '1000';
            alertContainer.style.width = '300px';
            document.body.appendChild(alertContainer);
        }
    }
    
    function showAlert(message, type = 'info', duration = 5000) {
        createAlertContainer();  // Ensure the container exists

        // Create the alert element
        var alertElement = document.createElement('div');
        alertElement.style.padding = '15px';
        alertElement.style.marginBottom = '15px';
        alertElement.style.borderRadius = '6px';
        alertElement.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        alertElement.style.fontSize = '16px';
        alertElement.style.wordBreak = 'break-word';
        alertElement.style.display = 'flex';
        alertElement.style.justifyContent = 'space-between';
        alertElement.style.alignItems = 'center';
        
        // Set styles and icon based on the alert type
        var icon = '';
        switch(type) {
            case 'success':
                alertElement.style.backgroundColor = '#d4edda';
                alertElement.style.color = '#155724';
                icon = '✅ ';
                break;
            case 'error':
                alertElement.style.backgroundColor = '#f8d7da';
                alertElement.style.color = '#721c24';
                icon = '❌ ';
                break;
            case 'warning':
                alertElement.style.backgroundColor = '#fff3cd';
                alertElement.style.color = '#856404';
                icon = '⚠️ ';
                break;
            default: // info
                alertElement.style.backgroundColor = '#d1ecf1';
                alertElement.style.color = '#0c5460';
                icon = 'ℹ️ ';
        }

        // Create close button for user to dismiss manually
        var closeButton = document.createElement('span');
        closeButton.innerHTML = '&times;';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.marginLeft = '10px';
        closeButton.onclick = function() {
            alertContainer.removeChild(alertElement);
        };
        
        alertElement.innerHTML = `<strong>${icon}${type.toUpperCase()}:</strong> ${message}`;
        alertElement.appendChild(closeButton);
        
        alertContainer.appendChild(alertElement);

        // Automatically remove the alert after the duration (if duration is not 0)
        if (duration > 0) {
            setTimeout(function() {
                if (alertElement.parentNode === alertContainer) {
                    alertContainer.removeChild(alertElement);
                }
            }, duration);
        }
    }
    
    // Override the default alert function
    var originalAlert = window.alert;
    window.alert = function(message) {
        if (typeof message === 'object') {
            // If the message is an object, we check for success or error fields
            if (message.success !== undefined) {
                if (message.success) {
                    showAlert(message.message || "Operation successful", "success");
                } else {
                    showAlert(message.error || "An error occurred", "error");
                }
            } else {
                // If object but not structured as expected, show it as info
                showAlert(message.message || "Unknown response", "info");
            }
        } else {
            try {
                // Try to parse the message if it's a JSON string
                var parsedMessage = JSON.parse(message);
                if (parsedMessage.success !== undefined) {
                    if (parsedMessage.success) {
                        showAlert(parsedMessage.message || "Operation successful", "success");
                    } else {
                        showAlert(parsedMessage.error || "An error occurred", "error");
                    }
                } else {
                    showAlert(parsedMessage.message || "Unknown response", "info");
                }
            } catch (e) {
                // If parsing fails, fallback to displaying the message as is
                showAlert(message, "info");
            }
        }
    };
    
    // Expose the showAlert function globally to allow calling it directly
    window.showAlert = showAlert;

})(window);
