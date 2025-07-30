import {Button, TextField} from "@mui/material";

export default function Shahkar(){
    return (
        <div className="flex flex-col mt-4">
            <div className="self-center flex flex-col w-fit gap-4">
                <TextField className="w-fit" label="کد ملی" variant="outlined" />
                <TextField className="w-fit" label="شماره موبایل" variant="outlined" />

                <Button variant="contained" className="self-start">تایید</Button>
            </div>

        </div>
    )
} 