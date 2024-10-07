/**
 * Execute the user's code.
 * Just a quick and dirty eval.  No checks for infinite loops, etc.
 */
function runJS() {
    var code = Blockly.Generator.workspaceToCode('JavaScript');
    try {
      eval(code);
    } catch (e) {
      alert('Program error:\n' + e);
    }
  }
  
  /**
   * Backup code blocks to localStorage.
   */
  function backup_blocks() {
    if ('localStorage' in window) {
      var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
      window.localStorage.setItem('arduino', Blockly.Xml.domToText(xml));
    }
  }
  
  /**
   * Restore code blocks from localStorage.
   */
  function restore_blocks() {
    if ('localStorage' in window && window.localStorage.arduino) {
      var xml = Blockly.Xml.textToDom(window.localStorage.arduino);
      Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
    }
  }
  
  /**
  * Save Arduino generated code to local file.
  */
  function saveCode() {
    var fileName = window.prompt('What would you like to name your file?', 'BlocklyDuino')
    //doesn't save if the user quits the save prompt
    if(fileName){
      var blob = new Blob([Blockly.Arduino.workspaceToCode()], {type: 'text/plain;charset=utf-8'});
      saveAs(blob, fileName + '.ino');
    }
  }
  
  /**
   * Save blocks to local file.
   * better include Blob and FileSaver for browser compatibility
   */
  function save() {
    var xml = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
    var data = Blockly.Xml.domToText(xml);
    var fileName = window.prompt('What would you like to name your file?', 'BlocklyDuino');
    // Store data in blob.
    // var builder = new BlobBuilder();
    // builder.append(data);
    // saveAs(builder.getBlob('text/plain;charset=utf-8'), 'blockduino.xml');
    if(fileName){
      var blob = new Blob([data], {type: 'text/xml'});
      saveAs(blob, fileName + ".xml");
    } 
  }
  
  /**
   * Load blocks from local file.
   */
  function load(event) {
    var files = event.target.files;
    // Only allow uploading one file.
    if (files.length != 1) {
      return;
    }
  
    // FileReader
    var reader = new FileReader();
    reader.onloadend = function(event) {
      var target = event.target;
      // 2 == FileReader.DONE
      if (target.readyState == 2) {
        try {
          var xml = Blockly.Xml.textToDom(target.result);
        } catch (e) {
          alert('Error parsing XML:\n' + e);
          return;
        }
        var count = Blockly.mainWorkspace.getAllBlocks().length;
        if (count && confirm('Replace existing blocks?\n"Cancel" will merge.')) {
          Blockly.mainWorkspace.clear();
        }
        Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
      }
      // Reset value of input after loading because Chrome will not fire
      // a 'change' event if the same file is loaded again.
      document.getElementById('load').value = '';
    };
    reader.readAsText(files[0]);
  }
  
  /**
   * Discard all blocks from the workspace.
   */
  function discard() {
    var count = Blockly.mainWorkspace.getAllBlocks().length;
    if (count < 2 || window.confirm('Delete all ' + count + ' blocks?')) {
      Blockly.mainWorkspace.clear();
      renderContent();
    }
  }
  
  /*
   * auto save and restore blocks
   */
  function auto_save_and_restore_blocks() {
    // Restore saved blocks in a separate thread so that subsequent
    // initialization is not affected from a failed load.
    window.setTimeout(restore_blocks, 0);
    // Hook a save function onto unload.
    bindEvent(window, 'unload', backup_blocks);
    tabClick(selected);
  
    // Init load event.
    var loadInput = document.getElementById('load');
    loadInput.addEventListener('change', load, false);
    document.getElementById('fakeload').onclick = function() {
      loadInput.click();
    };
  }
  
  /**
   * Bind an event to a function call.
   * @param {!Element} element Element upon which to listen.
   * @param {string} name Event name to listen to (e.g. 'mousedown').
   * @param {!Function} func Function to call when event is triggered.
   *     W3 browsers will call the function with the event object as a parameter,
   *     MSIE will not.
   */
  function bindEvent(element, name, func) {
    if (element.addEventListener) {  // W3C
      element.addEventListener(name, func, false);
    } else if (element.attachEvent) {  // IE
      element.attachEvent('on' + name, func);
    }
  }
  
  //loading examples via ajax
  var ajax;
  function createAJAX() {
    if (window.ActiveXObject) { //IE
      try {
        return new ActiveXObject("Msxml2.XMLHTTP");
      } catch (e) {
        try {
          return new ActiveXObject("Microsoft.XMLHTTP");
        } catch (e2) {
          return null;
        }
      }
    } else if (window.XMLHttpRequest) {
      return new XMLHttpRequest();
    } else {
      return null;
    }
  }
  
  function onSuccess() {
    if (ajax.readyState == 4) {
      if (ajax.status == 200) {
        try {
        var xml = Blockly.Xml.textToDom(ajax.responseText);
        } catch (e) {
          alert('Error parsing XML:\n' + e);
          return;
        }
        var count = Blockly.mainWorkspace.getAllBlocks().length;
        if (count && confirm('Replace existing blocks?\n"Cancel" will merge.')) {
          Blockly.mainWorkspace.clear();
        }
        Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xml);
      } else {
        alert("Server error");
      }
    }
  }
  
  function load_by_url(uri) {
    ajax = createAJAX();
    if (!ajax) {
  　　   alert ('Not compatible with XMLHttpRequest');
  　　   return 0;
  　  }
    if (ajax.overrideMimeType) {
      ajax.overrideMimeType('text/xml');
    }
  
  　　ajax.onreadystatechange = onSuccess;
  　　ajax.open ("GET", uri, true);
  　　ajax.send ("");
  }
  
  // function uploadCode(code, callback) {
  //     var target = document.getElementById('content_arduino');
  //     var spinner = new Spinner().spin(target);
  
  //     var url = "http://127.0.0.1:8080/";
  //     var method = "POST";
  
  //     // You REALLY want async = true.
  //     // Otherwise, it'll block ALL execution waiting for server response.
  //     var async = true;
  
  //     var request = new XMLHttpRequest();
      
  //     request.onreadystatechange = function() {
  //         if (request.readyState != 4) { 
  //             return; 
  //         }
          
  //         spinner.stop();
          
  //         var status = parseInt(request.status); // HTTP response status, e.g., 200 for "200 OK"
  //         var errorInfo = null;
  //         switch (status) {
  //         case 200:
  //             break;
  //         case 0:
  //             errorInfo = "code 0\n\nCould not connect to server at " + url + ".  Is the local web server running?";
  //             break;
  //         case 400:
  //             errorInfo = "code 400\n\nBuild failed - probably due to invalid source code.  Make sure that there are no missing connections in the blocks.";
  //             break;
  //         case 500:
  //             errorInfo = "code 500\n\nUpload failed.  Is the Arduino connected to USB port?";
  //             break;
  //         case 501:
  //             errorInfo = "code 501\n\nUpload failed.  Is 'ino' installed and in your path?  This only works on Mac OS X and Linux at this time.";
  //             break;
  //         default:
  //             errorInfo = "code " + status + "\n\nUnknown error.";
  //             break;
  //         };
          
  //         callback(status, errorInfo);
  //     };
  
  //     request.open(method, url, async);
  //     request.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
  //     request.send(code);	     
  // }
  
  // function uploadClick() {
  //     var code = Blockly.Arduino.workspaceToCode();
     
  //     alert("Ready to upload to Esp32.");
  //     console.log("Generated code:", code);
  //     compileBinary(code);
  //     // uploadCode(code, function(status, errorInfo) {
  //     //     if (status == 200) {
  //     //         alert("Program uploaded ok");
  //     //     } else {
  //     //         alert("Error uploading program: " + errorInfo);
  //     //     }
  //     // });
  // }
  // function compileBinary(code) {
  //   // ESP32 OTA boilerplate code
  //   const otaBoilerplate = `
  // #include <WiFi.h>
  // #include <WebServer.h>
  // #include <Update.h>
  // #include <ESPmDNS.h>
  
  // const char *ssid = "ESP32-OTA";
  // const char *password = "12345678";
  // const char *hostname = "esp32-ota";  // mDNS hostname
  
  // WebServer server(80);
  
  // const char* uploadPage = 
  // "<form method='POST' action='/update' enctype='multipart/form-data'>"
  // "<input type='file' name='update'>"
  // "<input type='submit' value='Update'>"
  // "</form>";
  // `;
  
  //   // Combine the OTA boilerplate with the user's code
  //   const modifiedCode = `
  // ${otaBoilerplate}
  
  // // User-defined functions and declarations preserved
  // ${code.replace(/void\s+setup\s*\(\)\s*{[^}]*}[\s\S]*?void\s+loop\s*\(\)\s*{[^}]*}/, '')}
  
  // void setup() {
  //   Serial.begin(115200);
  
  //   WiFi.softAP(ssid, password);
  //   Serial.println("Access Point Started");
  //   Serial.print("IP Address: ");
  //   Serial.println(WiFi.softAPIP());
  
  //   // Initialize mDNS service
  //   if (!MDNS.begin(hostname)) {
  //     Serial.println("Error setting up mDNS responder!");
  //     while (1) {
  //       delay(1000);
  //     }
  //   }
  //   Serial.printf("mDNS responder started with hostname: %s.local\\n", hostname);
  
  //   // Route to serve the upload page
  //   server.on("/", HTTP_GET, []() {
  //     server.send(200, "text/html", uploadPage);
  //   });
  
  //   // Handle the upload action
  //   server.on("/update", HTTP_POST, []() {
  //     server.sendHeader("Connection", "close");
  //     server.send(200, "text/plain", (Update.hasError()) ? "Update Failed!" : "Update Successful. Rebooting...");
  //     ESP.restart();
  //   }, []() {
  //     HTTPUpload& upload = server.upload();
  //     if (upload.status == UPLOAD_FILE_START) {
  //       Serial.printf("Update: %s\\n", upload.filename.c_str());
  //       if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
  //         Update.printError(Serial);
  //       }
  //     } else if (upload.status == UPLOAD_FILE_WRITE) {
  //       if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
  //         Update.printError(Serial);
  //       }
  //     } else if (upload.status == UPLOAD_FILE_END) {
  //       if (Update.end(true)) {
  //         Serial.printf("Update Success: %u bytes\\n", upload.totalSize);
  //       } else {
  //         Update.printError(Serial);
  //       }
  //     }
  //   });
  
  //   server.begin();
  
  //   // Call the user's setup function if it exists
  //   ${code.match(/void\s+setup\s*\(\)\s*{([^}]*)}/)?.[1] || ''}
  // }
  
  // void loop() {
    // server.handleClient();
  
    // Call the user's loop function if it exists
    // ${code.match(/void\s+loop\s*\(\)\s*{([^}]*)}/)?.[1] || ''}
  // }
  // `;
  
  //   // Send the modified code to the server for compilation
  //   fetch('/compile', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: modifiedCode,
  //   })
  //   .then(response => {
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
  //     return response.json();
  //   })
  //   .then(data => {
  //     if (data.success) {
  //       console.log("Compilation successful");
  //       // Handle successful compilation (e.g., show success message, initiate upload)
  //     } else {
  //       console.error("Compilation failed:", data.error);
  //       // Handle compilation error (e.g., show error message)
  //     }
  //   })
  //   .catch(error => {
  //     console.error('Error sending code to server:', error);
  //     // You might want to display this error to the user
  //   });
  // }
 
  
  function uploadClick() {
    var code = Blockly.Arduino.workspaceToCode();
    
    alert("Uploading Code.");
    console.log("Generated code:", code);
    compileBinary(code);
}

function compileBinary(code) {
  // ESP32 OTA boilerplate code
  const otaBoilerplate = `
#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>
#include <ESPmDNS.h>

const char *ssid = "ESP32-OTA";
const char *password = "12345678";
const char *hostname = "esp32-ota";  // mDNS hostname

WebServer server(80);

const char* uploadPage = 
"<form method='POST' action='/update' enctype='multipart/form-data'>"
"<input type='file' name='update'>"
"<input type='submit' value='Update'>"
"</form>";
`;

  // Combine the OTA boilerplate with the user's code
  const modifiedCode = `
${otaBoilerplate}

// User-defined functions and declarations preserved
${code.replace(/void\s+setup\s*\(\)\s*{[^}]*}[\s\S]*?void\s+loop\s*\(\)\s*{[^}]*}/, '')}

void setup() {
  Serial.begin(115200);

  WiFi.softAP(ssid, password);
  Serial.println("Access Point Started");
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());

  // Initialize mDNS service
  if (!MDNS.begin(hostname)) {
    Serial.println("Error setting up mDNS responder!");
    while (1) {
      delay(1000);
    }
  }
  Serial.printf("mDNS responder started with hostname: %s.local\\n", hostname);

  // Route to serve the upload page
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", uploadPage);
  });

  // Handle the upload action
  server.on("/update", HTTP_POST, []() {
    server.sendHeader("Connection", "close");
    server.send(200, "text/plain", (Update.hasError()) ? "Update Failed!" : "Update Successful. Rebooting...");
    ESP.restart();
  }, []() {
    HTTPUpload& upload = server.upload();
    if (upload.status == UPLOAD_FILE_START) {
      Serial.printf("Update: %s\\n", upload.filename.c_str());
      if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_WRITE) {
      if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_END) {
      if (Update.end(true)) {
        Serial.printf("Update Success: %u bytes\\n", upload.totalSize);
      } else {
        Update.printError(Serial);
      }
    }
  });

  server.begin();

  // Call the user's setup function if it exists
  ${code.match(/void\s+setup\s*\(\)\s*{([^}]*)}/)?.[1] || ''}
}

void loop() {
  server.handleClient();

  // Call the user's loop function if it exists
  ${code.match(/void\s+loop\s*\(\)\s*{([^}]*)}/)?.[1] || ''}
}
`;

window.go.main.App.CompileSketch(modifiedCode)
.then(response => {
    console.log("Compilation response:", response);
    alert(response); // This will trigger the new alert logic
})
.catch(error => {
    console.error("Compilation error:", error);

    // Pass the error as an object to classify it as an "error" alert
    alert({ error: "Error during compilation: " + error.message });
});
}


// Uncomment and implement this function if needed
// function handleUploadResponse(status, errorInfo) {
//     if (status == 200) {
//         alert("Program uploaded ok");
//     } else {
//         alert("Error uploading program: " + errorInfo);
//     }
// }






  // function compileBinary(code) {
  //   // ESP32 OTA boilerplate code
  //   const otaBoilerplate = `
  // #include <WiFi.h>
  // #include <WebServer.h>
  // #include <Update.h>
  // #include <ESPmDNS.h>
  
  // const char *ssid = "ESP32-OTA";
  // const char *password = "12345678";
  // const char *hostname = "esp32-ota";  // mDNS hostname
  
  // WebServer server(80);
  
  // const char* uploadPage = 
  // "<form method='POST' action='/update' enctype='multipart/form-data'>"
  // "<input type='file' name='update'>"
  // "<input type='submit' value='Update'>"
  // "</form>";
  // `;
  
  //   // Combine the OTA boilerplate with the user's code
  //   const modifiedCode = `
  // ${otaBoilerplate}
  
  // void setup() {
  // Serial.begin(115200);
  
  // WiFi.softAP(ssid, password);
  // Serial.println("Access Point Started");
  // Serial.print("IP Address: ");
  // Serial.println(WiFi.softAPIP());
  
  // // Initialize mDNS service
  // if (!MDNS.begin(hostname)) {
  // Serial.println("Error setting up mDNS responder!");
  // while (1) {
  // delay(1000);
  // }
  // }
  // Serial.printf("mDNS responder started with hostname: %s.local\\n", hostname);
  
  // // Route to serve the upload page
  // server.on("/", HTTP_GET, []() {
  // server.send(200, "text/html", uploadPage);
  // });
  
  // // Handle the upload action
  // server.on("/update", HTTP_POST, []() {
  // server.sendHeader("Connection", "close");
  // server.send(200, "text/plain", (Update.hasError()) ? "Update Failed!" : "Update Successful. Rebooting...");
  // ESP.restart();
  // }, []() {
  // HTTPUpload& upload = server.upload();
  // if (upload.status == UPLOAD_FILE_START) {
  // Serial.printf("Update: %s\\n", upload.filename.c_str());
  // if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
  //   Update.printError(Serial);
  // }
  // } else if (upload.status == UPLOAD_FILE_WRITE) {
  // if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
  //   Update.printError(Serial);
  // }
  // } else if (upload.status == UPLOAD_FILE_END) {
  // if (Update.end(true)) {
  //   Serial.printf("Update Success: %u bytes\\n", upload.totalSize);
  // } else {
  //   Update.printError(Serial);
  // }
  // }
  // });
  
  // server.begin();
  
  // ${code.match(/void\s+setup\s*\(\)\s*{([^}]*)}/)[1]}
  // }
  
  // void loop() {
  // server.handleClient();
  
  // ${code.match(/void\s+loop\s*\(\)\s*{([^}]*)}/)[1]}
  // }
  // `;
  
  //   // console.log("Full code being sent to the server:");
  //   // console.log(modifiedCode);
  
  //   // Send the modified code to the server for compilation
  //   fetch('/compile', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: modifiedCode,
  //   })
  //   .then(response => {
  //     // console.log("Received response from server:", response);
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
  //     return response.json();
  //   })
  //   .then(data => {
  //     // console.log("Parsed response data:", data);
  //     if (data.success) {
  //       console.log("Compilation successful");
  //       // Handle successful compilation (e.g., show success message, initiate upload)
  //     } else {
  //       console.error("Compilation failed:", data.error);
  //       // Handle compilation error (e.g., show error message)
  //     }
  //   })
  //   .catch(error => {
  //     console.error('Error sending code to server:', error);
  //     // You might want to display this error to the user
  //   });
  // }
  function resetClick() {
      var code = "void setup() {} void loop() {}";
  
      uploadCode(code, function(status, errorInfo) {
          if (status != 200) {
              alert("Error resetting program: " + errorInfo);
          }
      });
  }
  