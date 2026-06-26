import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MainPage } from './pages/MainPage'
import { ScooterPage } from './pages/ScooterPage'
import { QRScannerPage } from './pages/QRScannerPage'
import { FinishPhotoPage } from './pages/FinishPhotoPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/scooter/:number" element={<ScooterPage />} />
        <Route path="/scan" element={<QRScannerPage />} />
        <Route path="/finish-photo/:number" element={<FinishPhotoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
