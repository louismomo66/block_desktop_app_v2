package main

import (
	"bytes"
	"context"
	"embed"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed frontend/*
var assets embed.FS

//go:embed cli_binaries
var cliBinaries embed.FS

type App struct {
	ctx context.Context
}

// CompileSketch compiles the provided Arduino sketch
func (a *App) CompileSketch(sketch string) (string, error) {
	fmt.Println("Received sketch for compilation:")
	fmt.Println(sketch)

	gatewayIP, err := getGatewayIP()
	if err != nil {
		fmt.Printf("Error discovering gateway IP: %v\n", err)
		return "", err
	}

	// Adjust board type if necessary
	board := "esp32:esp32:esp32" // Replace with the correct FQBN for your ESP32 board
	esp32URL := "http://" + gatewayIP
	binary, err := compileBinary(sketch, board)
	if err != nil {
		log.Printf("error: Compilation failed: %v", err)
		return "", err
	}
	err = uploadFirmware(binary, esp32URL)
	if err != nil {
		log.Println("Error uploading firmware:", err)
		return "", err
	}
	return fmt.Sprintf(" success: Firmware upload; Binary size: %d bytes", len(binary)), nil
}

func uploadFirmware(firmwareData []byte, esp32URL string) error {
	// Create a buffer to store the multipart data
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Create a form field for the binary data
	part, err := writer.CreateFormFile("update", "firmware.bin") // "update" should match the ESP32 OTA field name
	if err != nil {
		return fmt.Errorf("error : could not create form file: %v", err)
	}

	// Copy the binary data to the multipart part
	if _, err = part.Write(firmwareData); err != nil {
		return fmt.Errorf("error: could not copy binary data: %v", err)
	}

	// Close the multipart writer to finalize the form
	err = writer.Close()
	if err != nil {
		return fmt.Errorf("error : could not close multipart writer: %v", err)
	}

	// Create the HTTP request
	req, err := http.NewRequest("POST", esp32URL+"/update", body)
	if err != nil {
		return fmt.Errorf("error:could not create HTTP request: %v", err)
	}

	// Set the content type to multipart/form-data
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Perform the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error: during HTTP request: %v", err)
	}
	defer resp.Body.Close()

	// Check the response status code
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("error: received non-OK response: %s", resp.Status)
	}

	fmt.Println("success: Firmware upload ")
	return nil
}

func compileBinary(sketch string, fqbn string) ([]byte, error) {
	// Extract the correct arduino-cli binary based on the OS
	cliPath, err := extractArduinoCli()
	if err != nil {
		return nil, fmt.Errorf("error: failed to extract arduino-cli: %v", err)
	}

	// Create a temporary directory for the sketch using os.MkdirTemp
	dir, err := os.MkdirTemp("", "sketch")
	if err != nil {
		return nil, fmt.Errorf("error: failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(dir) // Clean up after ourselves

	// The sketch file must have the same name as the directory
	sketchName := filepath.Base(dir) // Use the temp directory's name as the sketch name
	sketchPath := filepath.Join(dir, sketchName+".ino")

	// Write the sketch code to the file
	if err := os.WriteFile(sketchPath, []byte(sketch), 0644); err != nil {
		return nil, fmt.Errorf("error: failed to write sketch file: %v", err)
	}

	// Construct the command to compile the sketch
	compileArgs := []string{"compile", "--fqbn", fqbn, "--output-dir", dir, sketchPath}
	cmd := exec.Command(cliPath, compileArgs...)

	// Execute the command
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("error: compilation failed: %v\n%s", err, string(output))
	}

	// The binary output is typically named <sketch_name>.ino.bin
	binaryPath := filepath.Join(dir, sketchName+".ino.bin")
	binary, err := os.ReadFile(binaryPath)
	if err != nil {
		return nil, fmt.Errorf("error: failed to read compiled binary: %v", err)
	}

	return binary, nil
}

func extractArduinoCli() (string, error) {
	// Create a temporary directory to store the extracted binary
	tmpDir, err := os.MkdirTemp("", "arduino-cli")
	if err != nil {
		return "", err
	}

	// Detect the OS and architecture
	var cliBinary string
	switch runtime.GOOS {
	case "windows":
		switch runtime.GOARCH {
		case "amd64":
			cliBinary = "cli_binaries/arduino-cli_1.0.4_Windows_64bit/arduino-cli.exe"
		case "386":
			cliBinary = "cli_binaries/arduino-cli_1.0.4_Windows_32bit/arduino-cli.exe"
		default:
			return "", fmt.Errorf("unsupported Windows architecture: %s", runtime.GOARCH)
		}
	case "darwin": // macOS
		switch runtime.GOARCH {
		case "amd64":
			cliBinary = "cli_binaries/arduino-cli_1.0.4_macOS_64bit/arduino-cli"
		case "arm64":
			cliBinary = "cli_binaries/arduino-cli_1.0.4_macOS_ARM64/arduino-cli"
		default:
			return "", fmt.Errorf("unsupported macOS architecture: %s", runtime.GOARCH)
		}
	case "linux":
		switch runtime.GOARCH {
		case "amd64":
			cliBinary = "cli_binaries/arduino-cli_1.0.4_Linux_64bit/arduino-cli"
		case "386":
			cliBinary = "cli_binaries/arduino-cli_1.0.4_Linux_32bit/arduino-cli"
		case "arm":
			// On Linux ARM, you need to distinguish between ARMv6, ARMv7, and ARM64
			if strings.Contains(os.Getenv("GOARM"), "7") {
				cliBinary = "cli_binaries/arduino-cli_1.0.4_Linux_ARMv7/arduino-cli"
			} else if strings.Contains(os.Getenv("GOARM"), "6") {
				cliBinary = "cli_binaries/arduino-cli_1.0.4_Linux_ARMv6/arduino-cli"
			} else {
				cliBinary = "cli_binaries/arduino-cli_1.0.4_Linux_ARMv7/arduino-cli" // Default to ARMv7 if uncertain
			}
		case "arm64":
			cliBinary = "cli_binaries/arduino-cli_1.0.4_Linux_ARM64/arduino-cli"
		default:
			return "", fmt.Errorf("unsupported Linux architecture: %s", runtime.GOARCH)
		}
	default:
		return "", fmt.Errorf("unsupported platform: %s-%s", runtime.GOOS, runtime.GOARCH)
	}

	// Extract the embedded binary
	embeddedBinary, err := cliBinaries.Open(cliBinary)
	if err != nil {
		return "", err
	}
	defer embeddedBinary.Close()

	// Define the output path for the extracted binary
	outputBinary := filepath.Join(tmpDir, filepath.Base(cliBinary))

	outFile, err := os.Create(outputBinary)
	if err != nil {
		return "", err
	}
	defer outFile.Close()

	// Copy the binary from the embedded file to the output
	_, err = io.Copy(outFile, embeddedBinary)
	if err != nil {
		return "", err
	}

	// Make the binary executable
	err = os.Chmod(outputBinary, 0755)
	if err != nil {
		return "", err
	}

	return outputBinary, nil
}

func getGatewayIP() (string, error) {
	// Use 'netstat -rn' or 'ip route' depending on the OS
	cmd := exec.Command("netstat", "-rn") // On Linux/Mac use 'ip route' on Windows 'netstat -rn'
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to get routing table: %v", err)
	}

	// Parse output to find the gateway IP
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		// Example Linux output line: "0.0.0.0         192.168.4.1     0.0.0.0         UG    100    0        0 wlan0"
		if strings.Contains(line, "UG") { // Look for the 'UG' flag indicating the default gateway
			fields := strings.Fields(line)
			if len(fields) > 1 {
				return fields[1], nil
			}
		}
	}

	return "", fmt.Errorf("error: could not find gateway IP")
}

// NewApp creates a new App instance
func NewApp() *App {
	return &App{}
}

// startup is called on application startup
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func main() {
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "Arduino Compiler & OTA",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
