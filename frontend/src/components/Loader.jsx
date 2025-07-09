import React, { useState, useEffect } from "react";
import { Player } from "@lottiefiles/react-lottie-player";
import "../styles/Loader.css";
import { useLanguage } from "./LanguageContext";

const Loader = ({ isLoading }) => {
  const [isMobile, setIsMobile] = useState(false);
  const { language } = useLanguage();
  const isArabic = language === "ar";
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); // Set breakpoint for mobile
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize); // Cleanup on unmount
    };
  }, []);

  const containerStyle = isMobile
    ? {
        width: "100px",
        height: "100px",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        position: "fixed",
      }
    : {
        width: "200px",
        height: "200px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      };

  const playerStyle = isMobile
    ? {
        width: "50%",
        height: "50%",
        background: "none",
      }
    : {
        background: "none",
        margin: " 0px auto 0px 78px",
        outline: "none",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        position: "absolute",
        transform: "translate(-50%, -50%)",
        bottom: "0px",
        left: "32px",
        top: "0",
      };

  return (
    <div style={containerStyle}>
      <Player
        className="loading"
        autoplay
        loop
        src="/loading.json"
        style={playerStyle}
      />
      <div className="loader-container">
        <div className="animated-text" dir={language === "ar" ? "rtl" : "ltr"}>
          {(isArabic ? "جارٍ التحميل" : "Generating")
            .split("")
            .map((char, index) => (
              <div key={index} className="animated-text__letter">
                {char}
              </div>
            ))}
          <div className="animated-text__letter">⚈</div>
          <div className="animated-text__letter">⚈</div>
          <div className="animated-text__letter">⚈</div>
        </div>
      </div>
    </div>
  );
};

export default Loader;
