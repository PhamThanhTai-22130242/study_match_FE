import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../../../assets/img/logo.png";

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Trang chủ", href: "/" },
    { label: "Tính năng", href: "#features" },
    { label: "Cách hoạt động", href: "#how-it-works" },
    { label: "Cộng đồng", href: "#community" },
    { label: "Blog", href: "#blog" },
  ];

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("#")) {
      if (href === "#") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      try {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      } catch (err) {
        console.error("Invalid selector:", href, err);
      }
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white shadow-sm border-b border-gray-100"
          : "bg-white/80 backdrop-blur-md border-b border-gray-50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a
            href="#"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 group"
          >
            <img
              src={logo}
              alt="StudyMatch Logo"
              className="w-8 h-8 object-cover rounded-full flex-shrink-0"
            />
            <span className="text-lg font-bold text-[#3b82f6] tracking-tight">
              StudyMatch
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const isActive = link.label === "Trang chủ";
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    if (link.href.startsWith("#")) {
                      e.preventDefault();
                      handleNavClick(link.href);
                    }
                  }}
                  className={`relative px-3 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                    isActive
                      ? "text-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-[-20px] left-3 right-3 h-[2px] bg-[#3b82f6] rounded-full" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors duration-150"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#3b82f6] rounded-lg hover:bg-[#2563eb] shadow-sm shadow-[#3b82f6]/20 transition-all duration-150"
            >
              Đăng ký miễn phí
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-1.5 rounded-md text-gray-600 hover:bg-gray-50"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white border-t border-gray-100 px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => {
                if (link.href.startsWith("#")) {
                  e.preventDefault();
                  handleNavClick(link.href);
                } else {
                  setMobileOpen(false);
                }
              }}
              className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:text-[#3b82f6] hover:bg-gray-50 rounded-md transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 pb-1 flex flex-col gap-2">
            <Link
              to="/login"
              className="w-full text-center px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-[#3b82f6] rounded-lg hover:bg-[#2563eb] transition-all"
              onClick={() => setMobileOpen(false)}
            >
              Đăng ký miễn phí
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
