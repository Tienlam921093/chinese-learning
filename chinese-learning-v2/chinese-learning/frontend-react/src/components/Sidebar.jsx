import React from "react";
import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }) => ({
  display: "block",
  padding: "12px 16px",
  borderRadius: "10px",
  background: isActive ? "#1d4ed8" : "transparent",
  color: isActive ? "#fff" : "#0f172a",
  marginBottom: "8px",
});

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 240,
        padding: 20,
        borderRight: "1px solid #e2e8f0",
        background: "#fff",
      }}
    >
      <NavLink to="/lessons" style={linkStyle}>
        Bài học
      </NavLink>
      <NavLink to="/vocabulary" style={linkStyle}>
        Từ vựng
      </NavLink>
      <NavLink to="/chatbot" style={linkStyle}>
        Chatbot
      </NavLink>
      <NavLink to="/profile" style={linkStyle}>
        Hồ sơ
      </NavLink>
    </aside>
  );
}
