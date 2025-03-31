// Wait for DOM and face-api.js to load completely
document.addEventListener('DOMContentLoaded', () => {
    // Check if face-api is available
    const checkFaceApi = setInterval(() => {
        if (typeof faceapi !== 'undefined') {
            clearInterval(checkFaceApi);
            initApp();
        }
    }, 100);

    // If face-api doesn't load after 10 seconds, show error
    setTimeout(() => {
        if (typeof faceapi === 'undefined') {
            document.getElementById('status').textContent = 'Error: face-api.js failed to load. Please check your internet connection and refresh.';
            document.getElementById('loading').style.display = 'none';
        }
    }, 10000);
});

function initApp() {
    // DOM Elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const statusElement = document.getElementById('status');
    const emotionStatsElement = document.getElementById('emotionStats');
    const loadingOverlay = document.getElementById('loading');

    // Set up canvas context
    const ctx = canvas.getContext('2d');

    // Tracking state
    let isVideoPlaying = false;
    let detectionInterval;
    const emotions = ['angry', 'disgusted', 'fearful', 'happy', 'neutral', 'sad', 'surprised'];
    let emotionCounts = {};
    let detectionHistory = []; // Store recent detection results for smoothing

    // Configuration options
    const CONFIG = {
        detectionFrequency: 100, // ms between detections
        historyLength: 5, // Number of frames to keep for smoothing
        boxColors: {
            angry: '#FF5252', // Red
            disgusted: '#9C27B0', // Purple
            fearful: '#FFC107', // Amber
            happy: '#4CAF50', // Green
            neutral: '#2196F3', // Blue
            sad: '#607D8B', // Blue Grey
            surprised: '#FF9800' // Orange
        },
        confidenceThreshold: 0.70, // Minimum confidence to display secondary emotions
        boxStyle: {
            lineWidth: 3,
            cornerRadius: 5, // Rounded corners for face boxes
            opacity: 0.8
        },
        labelStyle: {
            fontSize: 14,
            fontFamily: 'Arial, sans-serif',
            padding: 6,
            opacity: 0.9,
            textShadow: true
        }
    };

    // Initialize emotion counts
    emotions.forEach(emotion => {
        emotionCounts[emotion] = 0;
    });

    // Load models from CDN
    async function loadModels() {
        try {
            statusElement.textContent = 'Loading models...';

            // Using CDN paths for models
            const modelUrl = 'https://justadudewhohacks.github.io/face-api.js/models';

            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
                faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
                faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
                faceapi.nets.faceExpressionNet.loadFromUri(modelUrl)
            ]);

            loadingOverlay.style.display = 'none';
            statusElement.textContent = 'Models loaded! Click "Start Camera" to begin.';

            // Create emotion stats cards
            createEmotionCards();
        } catch (err) {
            console.error('Failed to load models:', err);
            statusElement.textContent = 'Error loading models. Please refresh the page and try again.';
            loadingOverlay.style.display = 'none';
        }
    }

    // Create emotion stat cards
    function createEmotionCards() {
        emotionStatsElement.innerHTML = '';
        emotions.forEach(emotion => {
            const card = document.createElement('div');
            card.className = 'emotion-card';
            card.style.borderLeft = `4px solid ${CONFIG.boxColors[emotion] || '#ccc'}`;
            card.innerHTML = `
                <h3>${capitalizeFirstLetter(emotion)}</h3>
                <p id="${emotion}-count">0</p>
            `;
            emotionStatsElement.appendChild(card);
        });
    }

    // Start video from webcam
    async function startVideo() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: {
                        ideal: 640
                    },
                    height: {
                        ideal: 480
                    }
                }
            });
            video.srcObject = stream;
            isVideoPlaying = true;

            video.addEventListener('playing', () => {
                // Adjust canvas size when video loads
                setTimeout(resizeCanvas, 100);
                startDetection();
            });

            // Update button states
            startButton.disabled = true;
            stopButton.disabled = false;
            statusElement.textContent = 'Camera started! Detecting emotions...';
        } catch (err) {
            console.error('Error accessing webcam:', err);
            statusElement.textContent = 'Error accessing webcam. Please check camera permissions.';
        }
    }

    // Stop video from webcam
    function stopVideo() {
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
            isVideoPlaying = false;

            clearInterval(detectionInterval);

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update button states
            startButton.disabled = false;
            stopButton.disabled = true;
            statusElement.textContent = 'Camera stopped. Click "Start Camera" to begin again.';
        }
    }

    // Resize canvas to match video dimensions
    function resizeCanvas() {
        if (video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
    }

    // Start face detection
    function startDetection() {
        if (detectionInterval) {
            clearInterval(detectionInterval);
        }

        detectionInterval = setInterval(async () => {
            if (!isVideoPlaying) return;

            try {
                // Make sure canvas dimensions match video before detection
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    resizeCanvas();
                }

                const detections = await faceapi.detectAllFaces(video,
                        new faceapi.TinyFaceDetectorOptions({
                            inputSize: 320,
                            scoreThreshold: 0.5
                        }))
                    .withFaceLandmarks()
                    .withFaceExpressions();

                // Add to history and maintain limit
                detectionHistory.unshift(detections);
                if (detectionHistory.length > CONFIG.historyLength) {
                    detectionHistory.pop();
                }

                // Clear previous drawings
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw face boxes and expression labels
                drawDetections(detections);

                // Update emotion statistics
                updateEmotionStats(detections);
            } catch (err) {
                console.error('Detection error:', err);
            }
        }, CONFIG.detectionFrequency);
    }

    // Draw face detection boxes and labels
    function drawDetections(detections) {
        detections.forEach(detection => {
            const box = detection.detection.box;
            const expressions = detection.expressions;
            const landmarks = detection.landmarks;

            // Get all emotions sorted by probability
            const emotionEntries = Object.entries(expressions);
            const sortedEmotions = emotionEntries.sort((a, b) => b[1] - a[1]);

            // Primary emotion (highest probability)
            const [primaryEmotion, primaryProbability] = sortedEmotions[0];
            const boxColor = CONFIG.boxColors[primaryEmotion] || '#4CAF50';

            // Draw improved face box with rounded corners
            drawRoundedRect(
                ctx,
                box.x,
                box.y,
                box.width,
                box.height,
                CONFIG.boxStyle.cornerRadius,
                boxColor,
                CONFIG.boxStyle.lineWidth,
                CONFIG.boxStyle.opacity
            );

            // Calculate label positioning
            const labelY = Math.max(box.y - 10, 10);
            const labelX = box.x + box.width / 2;

            // Draw primary emotion label
            drawEmotionLabel(
                ctx,
                labelX,
                labelY - 25,
                `${capitalizeFirstLetter(primaryEmotion)} (${Math.round(primaryProbability * 100)}%)`,
                boxColor
            );

            // Draw secondary emotions (if they exceed threshold)
            let secondaryLabelOffset = 25;
            for (let i = 1; i < 3 && i < sortedEmotions.length; i++) {
                const [emotion, probability] = sortedEmotions[i];
                if (probability > CONFIG.confidenceThreshold) {
                    drawEmotionLabel(
                        ctx,
                        labelX,
                        labelY - 25 - secondaryLabelOffset,
                        `${capitalizeFirstLetter(emotion)} (${Math.round(probability * 100)}%)`,
                        CONFIG.boxColors[emotion] || '#777',
                        0.7 // Lower opacity for secondary emotions
                    );
                    secondaryLabelOffset += 25;
                }
            }

            // Display additional facial metrics
            drawFacialMetrics(ctx, detection, box, primaryProbability);

            // Draw key facial landmarks for visualization
            drawFacialLandmarks(ctx, landmarks);
        });
    }

    // Draw rounded rectangle for face boxes
    function drawRoundedRect(ctx, x, y, width, height, radius, color, lineWidth, opacity) {
        ctx.save();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        ctx.beginPath();

        // Draw rounded corners
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);

        ctx.stroke();

        // Draw a subtle background fill for better visibility
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = color;
        ctx.fill();

        ctx.restore();
    }

    // Draw emotion label with improved styling
    function drawEmotionLabel(ctx, x, y, text, bgColor, opacity = 1) {
        ctx.save();
        ctx.globalAlpha = opacity * CONFIG.labelStyle.opacity;

        // Measure text for proper sizing
        ctx.font = `${CONFIG.labelStyle.fontSize}px ${CONFIG.labelStyle.fontFamily}`;
        const textWidth = ctx.measureText(text).width;
        const padding = CONFIG.labelStyle.padding;
        const bgHeight = CONFIG.labelStyle.fontSize + padding * 2;

        // Draw label background with rounded corners
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.moveTo(x - textWidth / 2 - padding + 4, y - bgHeight / 2);
        ctx.lineTo(x + textWidth / 2 + padding - 4, y - bgHeight / 2);
        ctx.quadraticCurveTo(x + textWidth / 2 + padding, y - bgHeight / 2, x + textWidth / 2 + padding, y - bgHeight / 2 + 4);
        ctx.lineTo(x + textWidth / 2 + padding, y + bgHeight / 2 - 4);
        ctx.quadraticCurveTo(x + textWidth / 2 + padding, y + bgHeight / 2, x + textWidth / 2 + padding - 4, y + bgHeight / 2);
        ctx.lineTo(x - textWidth / 2 - padding + 4, y + bgHeight / 2);
        ctx.quadraticCurveTo(x - textWidth / 2 - padding, y + bgHeight / 2, x - textWidth / 2 - padding, y + bgHeight / 2 - 4);
        ctx.lineTo(x - textWidth / 2 - padding, y - bgHeight / 2 + 4);
        ctx.quadraticCurveTo(x - textWidth / 2 - padding, y - bgHeight / 2, x - textWidth / 2 - padding + 4, y - bgHeight / 2);
        ctx.closePath();
        ctx.fill();

        // Draw text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + 4);

        ctx.restore();
    }

    // Draw additional facial metrics
    function drawFacialMetrics(ctx, detection, box, confidence) {
        ctx.save();

        // Position metrics at the bottom of the face box
        const metricsY = box.y + box.height + 15;
        const metricsX = box.x + box.width / 2;

        // Estimate face angle from landmarks if available
        let faceAngle = "Unknown";
        if (detection.landmarks) {
            const landmarks = detection.landmarks.positions;
            // Simple face angle estimation (left-right head turn)
            if (landmarks.length >= 68) {
                const leftEye = landmarks[36];
                const rightEye = landmarks[45];
                const noseTip = landmarks[30];

                // Calculate horizontal angle approximately based on nose tip position
                const faceCenter = (leftEye.x + rightEye.x) / 2;
                const deviation = (noseTip.x - faceCenter) / (rightEye.x - leftEye.x);

                if (deviation < -0.2) faceAngle = "Right";
                else if (deviation > 0.2) faceAngle = "Left";
                else faceAngle = "Center";
            }
        }

        // Draw background for metrics
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(
            box.x,
            metricsY,
            box.width,
            45
        );

        // Display metrics text
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';

        ctx.fillText(`Confidence: ${Math.round(confidence * 100)}%`, metricsX, metricsY + 15);
        ctx.fillText(`Face Angle: ${faceAngle}`, metricsX, metricsY + 35);

        ctx.restore();
    }

    // Draw key facial landmarks
    function drawFacialLandmarks(ctx, landmarks) {
        if (!landmarks) return;

        ctx.save();

        // Draw key points around eyes, nose, and mouth for visualization
        const positions = landmarks.positions;

        // Eyes
        drawLandmarkGroup(ctx, positions.slice(36, 42), '#00BCD4'); // Left eye
        drawLandmarkGroup(ctx, positions.slice(42, 48), '#00BCD4'); // Right eye

        // Nose
        drawLandmarkGroup(ctx, positions.slice(27, 36), '#FFC107');

        // Mouth
        drawLandmarkGroup(ctx, positions.slice(48, 68), '#FF5722');

        ctx.restore();
    }

    // Draw a group of facial landmarks
    function drawLandmarkGroup(ctx, points, color) {
        if (!points || points.length === 0) return;

        // Draw points
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;

        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Connect points with lines
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        // Close the path for mouth and eyes
        ctx.closePath();
        ctx.stroke();
    }

    // Update emotion statistics
    function updateEmotionStats(detections) {
        if (detections.length === 0) return;

        // Reset counts for this frame
        emotions.forEach(emotion => {
            emotionCounts[emotion] = 0;
        });

        // Count emotions from current detections
        detections.forEach(detection => {
            const expressions = detection.expressions;
            let topEmotion = {
                name: 'neutral',
                probability: 0
            };

            for (const [emotion, probability] of Object.entries(expressions)) {
                if (probability > topEmotion.probability) {
                    topEmotion = {
                        name: emotion,
                        probability: probability
                    };
                }
            }

            emotionCounts[topEmotion.name]++;
        });

        // Update UI with animation
        emotions.forEach(emotion => {
            const countElement = document.getElementById(`${emotion}-count`);
            if (countElement) {
                const count = emotionCounts[emotion];

                // Add animation class if count increased
                if (parseInt(countElement.textContent) < count) {
                    countElement.classList.add('count-highlight');
                    setTimeout(() => countElement.classList.remove('count-highlight'), 300);
                }

                countElement.textContent = count;
            }
        });
    }

    // Helper function to capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Event listeners
    startButton.addEventListener('click', startVideo);
    stopButton.addEventListener('click', stopVideo);

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);

    // Load models
    loadModels();
}