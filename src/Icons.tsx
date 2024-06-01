import {SvgIcon} from "@mui/material";
import * as React from "react";

export function RightArrow(): React.ReactElement {
    return (
        <SvgIcon>
            <svg
                xmlns="http://www.w3.org/2000/svg"
    fill="000000"
    viewBox="0 0 24 24"
    stroke="currentColor"
    >
    <path
        d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
        />
        </svg>
        </SvgIcon>
);
}

export function LeftArrow() {
    return (
        <SvgIcon>
            <svg
                xmlns="http://www.w3.org/2000/svg"
    fill="000000"
    viewBox="0 0 24 24"
    stroke="currentColor"
    >
    <path
        d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
        />
        </svg>
        </SvgIcon>
);
}