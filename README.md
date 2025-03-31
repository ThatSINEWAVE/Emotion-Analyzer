<div align="center">

# [Emotion Analyzer](https://ThatSINEWAVE.github.io/Emotion-Analyzer)

A web application that detects faces in real-time using your device's camera and analyzes the emotional expressions of detected faces. It utilizes the powerful `face-api.js` library to perform face detection and emotion recognition.

![Emotion-Analyzer](https://raw.githubusercontent.com/ThatSINEWAVE/Emotion-Analyzer/refs/heads/main/.github/SCREENSHOTS/Emotion-Analyzer.png)

</div>

## Features

- 🎭 Real-time face detection and emotion analysis
- 📊 Emotion statistics tracking (happy, sad, angry, surprised, fearful, disgusted, neutral)
- 🎨 Visual feedback with color-coded face bounding boxes
- 📈 Confidence percentage display for each detected emotion
- 📱 Responsive design that works on both desktop and mobile devices
- ⚡ Smooth animations and intuitive UI

<div align="center">

## ☕ [Support my work on Ko-Fi](https://ko-fi.com/thatsinewave)

</div>

## Technologies Used

- **face-api.js** - JavaScript API for face detection and recognition
- **HTML5** - Structure of the web application
- **CSS3** - Styling and animations
- **JavaScript (ES6+)** - Application logic and face detection implementation

## How It Works

1. The application loads the required face detection models from a CDN
2. When you grant camera access, it starts capturing video from your device
3. The `face-api.js` library processes each frame to detect faces and their expressions
4. Detected emotions are displayed with bounding boxes and labels
5. Emotion statistics are updated in real-time

## Setup and Installation

No installation is required! You can use the application directly in your web browser:

1. Open the `index.html` file in a modern web browser (Chrome, Firefox, Edge recommended)
2. Click "Start Camera" and allow camera access when prompted
3. The application will begin detecting faces and analyzing emotions

Alternatively, you can host the files on any web server.

## File Structure

```
face-emotion-analyzer/
├── index.html          # Main HTML file
├── script.js           # JavaScript application logic
├── styles.css          # CSS styles
└── README.md           # This documentation file
```

## Browser Compatibility

The application works best on modern browsers that support:
- WebRTC (for camera access)
- ES6 JavaScript features
- CSS3 animations

Recommended browsers:
- Google Chrome (latest version)
- Mozilla Firefox (latest version)
- Microsoft Edge (Chromium-based)

## Credits

- Uses [face-api.js](https://github.com/justadudewhohacks/face-api.js) by Vincent Mühler
- UI design inspired by modern web design principles

## Known Limitations

- Performance may vary depending on your device's processing power
- Accuracy of emotion detection depends on lighting conditions and face orientation
- Some older browsers may not support all features

<div align="center">

## [Join my discord server](https://discord.gg/2nHHHBWNDw)

</div>

## Future Improvements

- Add option to capture and save emotion snapshots
- Implement historical emotion tracking over time
- Add more detailed facial analysis (age, gender estimation)
- Improve mobile performance and touch controls

## Contributing

Contributions are welcome! If you want to contribute, feel free to fork the repository, make your changes, and submit a pull request.

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.