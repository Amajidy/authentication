import React from 'react';
import { Button, TextField, Box, Typography, Container, Card, CardContent } from "@mui/material";
import { styled } from '@mui/material/styles';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// --- استایل‌های سفارشی با استفاده از styled ---

const PrimaryColor = '#1976D2'; // آبی اصلی MUI
const HoverColor = '#1565C0';

// کانتینر اصلی با پس‌زمینه ملایم
const StyledContainer = styled(Container)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#F7F9FC', // خاکستری روشن برای پس‌زمینه
}));

// کارت اصلی ورود اطلاعات
const StyledCard = styled(Card)(({ theme }) => ({
    padding: theme.spacing(4),
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)', // سایه ملایم و عمیق
    width: '100%',
    maxWidth: '400px', // عرض ثابت و مناسب
}));

// دکمه اصلی با استایل جذاب
const StyledButton = styled(Button)(({ theme }) => ({
    marginTop: theme.spacing(3),
    backgroundColor: PrimaryColor,
    '&:hover': {
        backgroundColor: HoverColor,
    },
    padding: theme.spacing(1.5, 3),
    fontSize: '1rem',
    borderRadius: '8px',
}));

// ---------------------------------------------

export default function Shahkar() {
    return (
        <StyledContainer maxWidth="sm">
            <StyledCard>
                {/* تیتر و توضیحات */}
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Typography
                        variant="h5"
                        component="h1"
                        fontWeight="bold"
                        color="text.primary"
                        sx={{ mb: 1 }}
                    >
                        احراز هویت
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        لطفاً کد ملی و شماره موبایل خود را وارد کنید.
                    </Typography>
                </Box>

                {/* فیلدهای ورودی */}
                <Box className="flex flex-col gap-5">
                    <TextField
                        fullWidth
                        label="کد ملی"
                        variant="outlined"
                        type="number" // برای موبایل: کیبورد عددی فعال می‌شود
                        InputProps={{
                            startAdornment: (
                                <VpnKeyIcon color="action" sx={{ mr: 1 }} />
                            ),
                        }}
                    />
                    <TextField
                        fullWidth
                        label="شماره موبایل"
                        variant="outlined"
                        type="tel" // برای موبایل: کیبورد تلفن فعال می‌شود
                        InputProps={{
                            startAdornment: (
                                <PhoneAndroidIcon color="action" sx={{ mr: 1 }} />
                            ),
                        }}
                    />

                    {/* دکمه تایید */}
                    <StyledButton
                        variant="contained"
                        fullWidth
                        startIcon={<CheckCircleOutlineIcon />}
                    >
                        تایید و ارسال کد
                    </StyledButton>
                </Box>
            </StyledCard>
        </StyledContainer>
    );
}