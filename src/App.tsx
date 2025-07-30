
import './App.css'
import { Outlet } from 'react-router'
import {ThemeProvider} from "@mui/material";
import theme from "./theme.ts";
import {CacheProvider} from "@emotion/react";
import cacheRtl from "./cacheRtl.ts";

function App() {

  return (
      <CacheProvider value={cacheRtl}>
          <ThemeProvider theme={theme}>
              <Outlet />
          </ThemeProvider>
      </CacheProvider>
  )
}

export default App
