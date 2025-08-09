import React, { useRef, useState, useEffect } from "react";
import { Button, Paper, Typography } from "@mui/material";

export default function SignaturePad() {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const ctx = canvas.getContext("2d");
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctxRef.current = ctx;
    }, []);

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

    const getCoordinates = (e) => {
        if (e.touches) {
            const rect = canvasRef.current.getBoundingClientRect();
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top,
            };
        }
        return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY };
    };

    const clearCanvas = () => {
        ctxRef.current.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
        );
    };

    const saveSignature = () => {
        const dataUrl = canvasRef.current.toDataURL("image/png");
        console.log("Signature Base64:", dataUrl);
        alert("امضا ذخیره شد (مشاهده در Console)");
    };

    return (
        <div className="flex flex-col items-center p-4 gap-4">
            <Typography variant="h5" className="mb-2 font-bold">
                امضای خود را وارد کنید
            </Typography>

            <Paper
                elevation={3}
                className="border border-gray-300 rounded-lg overflow-hidden"
            >
                <canvas
                    ref={canvasRef}
                    className="bg-white w-[300px] h-[200px] touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </Paper>

            <div className="flex gap-2">
                <Button variant="contained" color="primary" onClick={saveSignature}>
                    ذخیره
                </Button>
                <Button variant="outlined" color="error" onClick={clearCanvas}>
                    پاک کردن
                </Button>
            </div>
        </div>
    );
}
