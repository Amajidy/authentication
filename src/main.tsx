import App from './App.tsx'

import './index.css'

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router";

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import Shahkar from './pages/Shahkar.tsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <StrictMode><App /></StrictMode>,
    children: [
      {
        path: 'shahkar',
        element: <Shahkar />
      }
    ]
  },
]);

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
  <RouterProvider router={router} />,
);