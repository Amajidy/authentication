import React, { useRef, useState, useEffect } from "react";
import { Button, Paper, Typography, Box, Container } from "@mui/material";
import { styled } from '@mui/material/styles';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';

// --- Styled Components for Enhanced UI/UX ---

// 1. Enhanced Container for better centering and background
const StyledContainer = styled(Container)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(4),
    minHeight: '100vh',
    // Optional: Add a light background tint for contrast
    backgroundColor: '#f5f7f9',
}));

// 2. Styled Paper for the Signature Pad area
const SignaturePaper = styled(Paper)(({ theme }) => ({
    border: '2px solid #D1D5DB', // Light border
    borderRadius: theme.shape.borderRadius * 2, // More rounded corners
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)', // Deeper, softer shadow
    width: '100%',
    maxWidth: '500px', // Set a max width for desktop view
    aspectRatio: '3 / 2', // Maintain aspect ratio for the canvas
    [theme.breakpoints.down('sm')]: {
        maxWidth: '90%', // Better fit on small screens
    },
}));

// 3. Canvas style inside the Paper
const StyledCanvas = styled('canvas')({
    display: 'block',
    backgroundColor: 'white',
    width: '100%',
    height: '100%',
    touchAction: 'none', // Prevents scrolling on touch
    cursor: 'crosshair', // Better cursor for drawing
});

// ---------------------------------------------

export default function SignaturePad() {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // --- LOGIC: Setup Canvas ---
    useEffect(() => {
        const canvas = canvasRef.current;
        // Adjust canvas resolution to match its display size for high-quality drawing
        const scale = window.devicePixelRatio || 1;

        canvas.width = canvas.offsetWidth * scale;
        canvas.height = canvas.offsetHeight * scale;

        const ctx = canvas.getContext("2d");
        // Scale all subsequent drawing operations
        ctx.scale(scale, scale);

        ctx.lineCap = "round";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3; // Slightly thicker line for better visibility
        ctxRef.current = ctx;
    }, []);

    // --- LOGIC: Drawing Handlers ---
    const startDrawing = (e) => {
        e.preventDefault();
        const { offsetX, offsetY } = getCoordinates(e);
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const { offsetX, offsetY } = getCoordinates(e);
        ctxRef.current.lineTo(offsetX, offsetY);
        ctxRef.current.stroke();
    };

    const stopDrawing = () => {
        ctxRef.current.closePath();
        setIsDrawing(false);
    };

    // --- LOGIC: Coordinate Calculation (Including Touch) ---
    const getCoordinates = (e) => {
        if (e.touches && e.touches.length > 0) {
            const rect = canvasRef.current.getBoundingClientRect();
            // We use the scaled canvas dimensions for clearing, but the drawing
            // coordinates need to be relative to the *displayed* size before scaling.
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top,
            };
        }
        // Fallback for mouse events
        // Note: nativeEvent.offsetX is fine for non-scaled canvas elements,
        // but can be unreliable. For simplicity and consistency with touch, we can use clientX/Y as well.
        if (e.nativeEvent.offsetX !== undefined) {
            return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY };
        }

        const rect = canvasRef.current.getBoundingClientRect();
        return {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
        };
    };

    // --- LOGIC: Actions ---
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        // Reset the transformation before clearing
        const scale = window.devicePixelRatio || 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Restore the transformation for drawing
        ctx.scale(scale, scale);
    };

    const saveSignature = () => {
        // Use the default scale, PNG format provides transparency if needed
        const dataUrl = canvasRef.current.toDataURL("image/png");
        console.log("Signature Base64:", dataUrl);
        // UX improvement: Use a more subtle feedback than a default alert
        // (For a real app, use a Snackbar or Dialog)
        alert("✅ امضا با موفقیت ذخیره شد (مشاهده در Console مرورگر).");
    };

    // --- RENDER (Enhanced UI/UX) ---
    return (
        <StyledContainer maxWidth="md">
            <Typography
                variant="h4"
                sx={{ mb: 4, fontWeight: 'fontWeightBold', color: 'text.primary', display: 'flex', alignItems: 'center' }}
            >
                <BorderColorIcon color="primary" sx={{ mr: 1 }} />
                ثبت امضای دیجیتال
            </Typography>

            {/* Signature Pad */}
            <SignaturePaper elevation={5}>
                <StyledCanvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </SignaturePaper>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                لطفاً امضای خود را با دقت وارد کنید.
            </Typography>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, width: '100%', maxWidth: '400px', mt: 2 }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={saveSignature}
                    fullWidth
                    size="large"
                    startIcon={<SaveIcon />}
                >
                    ذخیره امضا
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    onClick={clearCanvas}
                    fullWidth
                    size="large"
                    startIcon={<ClearIcon />}
                >
                    پاک کردن
                </Button>
            </Box>
        </StyledContainer>
    );
}