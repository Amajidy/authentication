import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Alert, Box, Button, CircularProgress, Typography, Container, Card, CardContent, IconButton, LinearProgress } from "@mui/material";
import { styled } from '@mui/material/styles';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VideocamIcon from '@mui/icons-material/Videocam';
import ReplayIcon from '@mui/icons-material/Replay';

// --- استایل‌سازی مینیمال و جدید ---

const PrimaryColor = '#3F51B5'; // Indigo/Blue
const HoverColor = '#303F9F';

// دکمه Floating برای شروع/توقف ضبط
const FloatingButton = styled(Button)(({ theme }) => ({
    backgroundColor: PrimaryColor,
    color: '#fff',
    padding: theme.spacing(2, 4),
    fontSize: '1.1rem',
    borderRadius: '40px', // کاملاً گرد
    boxShadow: `0 8px 20px 0 rgba(63, 81, 181, 0.5)`,
    transition: 'all 0.3s ease',
    '&:hover': {
        backgroundColor: HoverColor,
        boxShadow: `0 0 15px 0 ${PrimaryColor}`,
    },
    '&:disabled': {
        backgroundColor: '#CFD8DC',
        color: '#78909C',
    },
}));

// کانتینر اصلی با استایل تمیز و مینیمال
const StyledCard = styled(Card)(({ theme }) => ({
    borderRadius: '20px',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.1)',
    backgroundColor: 'white',
}));

// باکس ویدئو با حاشیه و سایه بهتر
const VideoBox = styled(Box)(({ theme }) => ({
    position: 'relative',
    width: '100%',
    paddingTop: '75%', // نسبت تصویر 4:3
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: '#ECEFF1', // پس زمینه خاکستری روشن
    border: `2px solid ${PrimaryColor}`,
}));

// ----------------------------------------

export default function FaceDetectionRecorder() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const animationFrameRef = useRef(null);

    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [recording, setRecording] = useState(false);
    const [message, setMessage] = useState("");
    const [recordedVideoURL, setRecordedVideoURL] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    // تابع شروع استریم دوربین و میکروفن
    const startCameraStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            return stream;
        } catch (err) {
            console.error("خطا در دسترسی به دوربین و میکروفن:", err);
            setMessage("❌ دسترسی به دوربین و میکروفن رد شد.");
            return null;
        }
    };

    // تابع Warm-up
    const warmUpFaceDetection = async () => {
        if (!videoRef.current || !videoRef.current.srcObject) return;

        await new Promise(resolve => {
            const checkVideoReady = () => {
                if (videoRef.current && videoRef.current.readyState >= 3) {
                    resolve();
                } else if (videoRef.current) {
                    setTimeout(checkVideoReady, 100);
                }
            };
            checkVideoReady();
        });

        console.log("شروع Warm-up مدل‌های Face-API...");

        try {
            await faceapi.detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options());
            console.log("Warm-up موفقیت‌آمیز بود.");
            setMessage("✅ سیستم آماده است. برای شروع ضبط، دکمه را فشار دهید.");

            // شروع حلقه رندر تشخیص چهره پس از Warm-up
            runDetectionLoop();
        } catch (error) {
            console.error("خطا در Warm-up:", error);
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
                setMessage("✅ مدل‌ها لود شدند. در حال آماده‌سازی سیستم...");
            } catch (err) {
                console.error("خطا در لود مدل‌ها:", err);
                setMessage("❌ خطا در لود مدل‌ها. لطفاً صفحه را رفرش کنید.");
            }
        };
        loadModels();
    }, []);

    // شروع استریم دوربین و Warm-up
    useEffect(() => {
        if (modelsLoaded) {
            startCameraStream().then(stream => {
                if (stream) {
                    warmUpFaceDetection();
                }
            });
        }

        // Cleanup
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
    }, [modelsLoaded]);

    // تابع جدید: حلقه رندر برای تشخیص چهره روان
    const runDetectionLoop = async () => {
        if (!modelsLoaded || !videoRef.current || videoRef.current.ended) {
            animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!canvas) {
            animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
            return;
        }

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const detections = await faceapi
            .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks();

        if (detections.length > 0) {
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            resizedDetections.forEach(det => {
                const drawBox = new faceapi.draw.DrawBox(det.detection.box, {
                    label: "چهره",
                    lineWidth: 3,
                    boxColor: "#3F51B5",
                    drawLabelOptions: { fontSize: 16, fontColor: "white" }
                });
                drawBox.draw(canvas);
            });
        }

        animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
    };


    // شروع ضبط (اصلاح شده)
    const startRecording = async () => {
        // 1. اطمینان از فعال بودن استریم دوربین
        if (recordedVideoURL) {
            const stream = await startCameraStream();
            if (!stream) return;
        } else if (!videoRef.current?.srcObject) {
            const stream = await startCameraStream();
            if (!stream) return;
        }

        // 2. [اصلاح]: تضمین فعال بودن حلقه تشخیص چهره
        // این حلقه باید در حین ضبط نیز فعال بماند تا مربع نمایش داده شود.
        if (!animationFrameRef.current) {
            runDetectionLoop();
        }

        // 3. شروع ضبط MediaRecorder
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
            };
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            setRecordedVideoURL(url);

            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }

            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }

            // متوقف کردن حلقه تشخیص پس از ضبط
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            setMessage("✅ ضبط با موفقیت انجام شد. می‌توانید ویدئو را بازبینی کنید.");
        };

        mediaRecorder.start();
        setRecording(true);
        setMessage("🔴 در حال ضبط... چهره را در کادر نگه دارید.");
    };

    // توقف ضبط و تشخیص
    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        setRecording(false);
    };

    // کنترل دکمه ضبط
    const toggleRecording = () => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // ... (بقیه توابع پلی‌بک و کمکی بدون تغییر) ...

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

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const current = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        if (duration > 0) {
            setProgress(current / duration);
        }
        if (videoRef.current.ended) {
            setIsPlaying(false);
        }
    };

    const handleProgressClick = (e) => {
        if (!videoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = (clickX / rect.width) * videoRef.current.duration;
        videoRef.current.currentTime = newTime;
    };

    const formatTime = (time) => {
        if (!time) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <Container component="main" maxWidth="sm" sx={{ padding: 2 }}>
            <StyledCard>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h4" component="h1" gutterBottom align="center"
                                sx={{ fontWeight: 'bold', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}
                    >
                        <VideocamIcon color="primary" sx={{ mr: 1, fontSize: '1.2em' }} />
                        سیستم احراز هویت ویدئویی
                    </Typography>

                    {/* کانتینر ویدئو با طراحی جدید */}
                    <VideoBox elevation={3}>
                        <video
                            ref={videoRef}
                            autoPlay={!recordedVideoURL}
                            muted={recording || !recordedVideoURL}
                            playsInline
                            onClick={recordedVideoURL ? handlePlaybackClick : undefined}
                            onTimeUpdate={handleTimeUpdate}
                            className="absolute top-0 left-0 w-full h-full object-cover"
                            src={recordedVideoURL || undefined}
                        />

                        {/* Canvas برای کشیدن باکس روی ویدئو */}
                        <canvas
                            ref={canvasRef}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                                zIndex: 5,
                            }}
                        />

                        {/* لودینگ مدل‌ها (Overlay) */}
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
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                color: 'white',
                                zIndex: 10,
                            }}>
                                <CircularProgress color="inherit" size={50} />
                                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                                    در حال لود و آماده‌سازی سیستم هوش مصنوعی...
                                </Typography>
                            </Box>
                        )}

                        {/* دکمه Play/Pause شناور روی ویدئو ضبط شده */}
                        {recordedVideoURL && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    opacity: isPlaying ? 0 : 1,
                                    transition: 'opacity 0.3s',
                                    zIndex: 15,
                                    pointerEvents: 'none',
                                }}
                            >
                                <IconButton
                                    onClick={(e) => { e.stopPropagation(); handlePlaybackClick(); }}
                                    sx={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                                        backdropFilter: 'blur(5px)',
                                        color: PrimaryColor,
                                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.6)' },
                                        pointerEvents: 'auto',
                                    }}
                                    size="large"
                                >
                                    {isPlaying ? <PauseIcon sx={{ fontSize: 60 }} /> : <PlayArrowIcon sx={{ fontSize: 60 }} />}
                                </IconButton>
                            </Box>
                        )}

                        {/* نوار پیشرفت پخش (پایین ویدئو) */}
                        {recordedVideoURL && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    p: 1.5,
                                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    zIndex: 20
                                }}
                            >
                                <Typography variant="caption" sx={{ color: 'white', minWidth: '35px' }}>
                                    {formatTime(videoRef.current?.currentTime)}
                                </Typography>
                                <Box
                                    onClick={handleProgressClick}
                                    sx={{ flexGrow: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 3, cursor: 'pointer' }}
                                >
                                    <LinearProgress
                                        variant="determinate"
                                        value={progress * 100}
                                        sx={{ height: '100%', borderRadius: 3, backgroundColor: 'transparent', '& .MuiLinearProgress-bar': { backgroundColor: PrimaryColor, transition: 'none' } }}
                                    />
                                </Box>
                                <Typography variant="caption" sx={{ color: 'white', minWidth: '35px' }}>
                                    {formatTime(videoRef.current?.duration)}
                                </Typography>
                            </Box>
                        )}
                    </VideoBox>

                    {/* دکمه اصلی ضبط در پایین کادر */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, position: 'relative' }}>
                        <FloatingButton
                            variant="contained"
                            onClick={toggleRecording}
                            disabled={!modelsLoaded || message.includes("در حال آماده‌سازی...") || recordedVideoURL}
                            size="large"
                            startIcon={recording ? <StopCircleIcon /> : <CameraAltIcon />}
                        >
                            <Typography variant="button" sx={{ fontWeight: 'bold' }}>
                                {recording ? "توقف ضبط" : "شروع احراز هویت"}
                            </Typography>
                        </FloatingButton>
                    </Box>

                    {/* پیام‌ها و دکمه‌های ثانویه */}
                    <Box sx={{ mt: 3 }}>
                        {message && (
                            <Alert
                                severity={message.includes("❌") ? "error" : (message.includes("✅") ? "success" : "info")}
                                icon={message.includes("❌") ? <ErrorOutlineIcon /> : (message.includes("✅") ? <CheckCircleOutlineIcon /> : null)}
                                variant="filled"
                                sx={{ mb: 2, borderRadius: '12px' }}
                            >
                                <Typography variant="body2" fontWeight="medium">{message}</Typography>
                            </Alert>
                        )}

                        {recordedVideoURL && !recording && (
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => { setRecordedVideoURL(null); startCameraStream(); runDetectionLoop(); setMessage("✅ سیستم آماده است. برای شروع ضبط، دکمه را فشار دهید."); }}
                                fullWidth
                                sx={{ mt: 1, color: PrimaryColor, borderColor: PrimaryColor }}
                                startIcon={<ReplayIcon />}
                            >
                                ضبط مجدد
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </StyledCard>
        </Container>
    );
}