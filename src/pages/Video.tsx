import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Alert, Box, Button, CircularProgress, Typography, Container, Card, CardContent } from "@mui/material";
import { styled } from '@mui/material/styles';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import StopCircleIcon from '@mui/icons-material/StopCircle';

// A styled button component using Tailwind CSS
const StyledButton = styled(Button)(({ theme }) => ({
    backgroundColor: '#10B981', // green-500
    '&:hover': {
        backgroundColor: '#059669', // green-600
    },
}));

export default function FaceDetectionRecorder() {
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const detectionIntervalRef = useRef(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [recording, setRecording] = useState(false);
    const [message, setMessage] = useState("");
    const [recordedVideoURL, setRecordedVideoURL] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    // تابع شروع استریم دوربین و میکروفن
    const startCameraStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); // audio:true اضافه شد
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setRecordedVideoURL(null); // پاک کردن ویدئو ضبط شده قبلی
            }
            return stream;
        } catch (err) {
            console.error("خطا در دسترسی به دوربین و میکروفن:", err);
            setMessage("❌ دسترسی به دوربین و میکروفن رد شد.");
            return null;
        }
    };

    // لود مدل‌ها
    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = "/models";
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                setMessage("✅ مدل‌ها با موفقیت لود شدند.");
            } catch (err) {
                console.error("خطا در لود مدل‌ها:", err);
                setMessage("❌ خطا در لود مدل‌ها. لطفاً صفحه را رفرش کنید.");
            }
        };
        loadModels();
    }, []);

    // شروع استریم دوربین وقتی مدل‌ها لود شدند
    useEffect(() => {
        if (modelsLoaded) {
            startCameraStream();
        }

        // پاک کردن استریم هنگام unmount
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        }
    }, [modelsLoaded]);

    // تابع تشخیص چهره
    const detectFace = async () => {
        if (!modelsLoaded || !videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

        const video = videoRef.current;
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        if (displaySize.width === 0 || displaySize.height === 0) return;

        const detections = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks();

        if (!detections) {
            setMessage("❌ چهره‌ای تشخیص داده نشد. لطفاً در مرکز کادر قرار بگیرید.");
            return;
        }

        const landmarks = detections.landmarks;
        const box = detections.detection.box;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        const isFaceTooSmall = box.width < videoWidth * 0.3 || box.height < videoHeight * 0.4;
        const isFaceOutOfFrame =
            box.x < 20 || box.y < 20 ||
            (box.x + box.width) > (videoWidth - 20) ||
            (box.y + box.height) > (videoHeight - 20);

        if (isFaceTooSmall || isFaceOutOfFrame) {
            setMessage("❌ لطفاً صورت را کامل و در مرکز کادر قرار دهید.");
            return;
        }

        // بررسی پوشیدگی دهان
        const mouth = landmarks.getMouth();
        const faceWidth = landmarks.getJawOutline()[16].x - landmarks.getJawOutline()[0].x;
        const mouthWidth = Math.abs(mouth[6].x - mouth[0].x);
        const mouthHeight = Math.abs(mouth[3].y - mouth[9].y);

        if (mouthWidth < faceWidth * 0.2 || mouthHeight < faceWidth * 0.05) {
            setMessage("❌ بخشی از صورت یا دهان پوشیده شده است.");
            return;
        }

        // اگر همه‌چیز اوکی بود
        setMessage("✅ چهره شما کامل و واضح شناسایی شد.");
    };

    // شروع ضبط و تشخیص
    const startRecording = async () => {
        if (recordedVideoURL) {
            // اگر ویدئو قبلی بود، استریم دوربین رو مجدد فعال کن
            const stream = await startCameraStream();
            if (!stream) return;
        } else if (!videoRef.current?.srcObject) {
            const stream = await startCameraStream();
            if (!stream) return;
        }

        recordedChunksRef.current = [];
        const options = { mimeType: "video/webm; codecs=vp9" };
        let mediaRecorder;
        try {
            mediaRecorder = new MediaRecorder(videoRef.current.srcObject, options);
        } catch (e) {
            mediaRecorder = new MediaRecorder(videoRef.current.srcObject);
        }
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            setRecordedVideoURL(url);

            // بستن استریم دوربین هنگام توقف ضبط
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        };

        mediaRecorder.start();
        detectionIntervalRef.current = setInterval(() => {
            detectFace();
        }, 500);
        setRecording(true);
        setMessage("🔴 ضبط و تشخیص فعال است.");
    };

    // توقف ضبط و تشخیص
    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        clearInterval(detectionIntervalRef.current);
        setRecording(false);
        setMessage("⏹ ضبط متوقف شد.");
    };

    // کنترل دکمه ضبط
    const toggleRecording = () => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // کنترل پلی/پاز روی ویدئو بازپخش شده
    const handlePlaybackClick = () => {
        if (!videoRef.current) return;

        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    // بروزرسانی progress نوار زمانی
    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const current = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        if (duration > 0) {
            setProgress(current / duration);
        }
    };

    // کنترل کلیک روی نوار برای رفتن به زمان خاص
    const handleProgressClick = (e) => {
        if (!videoRef.current) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = (clickX / rect.width) * videoRef.current.duration;
        videoRef.current.currentTime = newTime;
    };

    return (
        <Container component="main" maxWidth="sm" className="p-4 mx-auto">
            <Card className="shadow-lg rounded-lg">
                <CardContent>
                    <Typography variant="h5" component="h1" gutterBottom align="center" className="text-xl font-bold text-gray-800">
                        تشخیص چهره در ویدئو
                    </Typography>

                    <Box sx={{ position: 'relative', width: '100%', paddingTop: '75%' }}>
                        <video
                            ref={videoRef}
                            autoPlay={!recordedVideoURL}
                            muted={recording} // هنگام ضبط میوت باشه (صدای میکروفن پخش نشه)
                            playsInline
                            onClick={recordedVideoURL ? handlePlaybackClick : undefined}
                            onTimeUpdate={handleTimeUpdate}
                            className="absolute top-0 left-0 w-full h-full object-cover rounded-lg border-2 border-gray-300 cursor-pointer"
                            src={recordedVideoURL || undefined}
                        />
                        {!modelsLoaded && (
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                color: 'white',
                            }}>
                                <CircularProgress color="inherit" />
                                <Typography className="mt-2">
                                    در حال لود مدل‌های هوش مصنوعی...
                                </Typography>
                            </Box>
                        )}

                        {/* نوار پیشرفت روی ویدئو (فقط وقتی ویدئو ضبط شده داریم) */}
                        {recordedVideoURL && (
                            <Box
                                onClick={handleProgressClick}
                                sx={{
                                    position: 'absolute',
                                    bottom: 10,
                                    left: 10,
                                    right: 10,
                                    height: 6,
                                    backgroundColor: 'rgba(255,255,255,0.4)',
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                }}
                            >
                                <Box
                                    sx={{
                                        height: '100%',
                                        width: `${progress * 100}%`,
                                        backgroundColor: '#10B981',
                                        borderRadius: 3,
                                        transition: 'width 0.1s linear',
                                    }}
                                />
                            </Box>
                        )}
                    </Box>

                    <Box className="mt-4">
                        {message && (
                            <Alert
                                severity={message.includes("❌") ? "warning" : "success"}
                                className="w-full mb-4"
                            >
                                {message}
                            </Alert>
                        )}
                        <Box className="flex justify-center">
                            <StyledButton
                                variant="contained"
                                onClick={toggleRecording}
                                disabled={!modelsLoaded}
                                className="w-full"
                                startIcon={recording ? <StopCircleIcon /> : <CameraAltIcon />}
                            >
                                {recording ? "توقف ضبط" : "شروع ضبط"}
                            </StyledButton>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
}
