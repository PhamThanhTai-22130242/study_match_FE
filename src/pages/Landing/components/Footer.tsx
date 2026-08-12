import React from "react";
import logo from "../../../assets/img/logo.png";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: "Khám phá",
      links: [
        { label: "Trang chủ", href: "#about" },
        { label: "Tính năng", href: "#features" },
        { label: "Cách hoạt động", href: "#how-it-works" },
      ],
    },
    {
      title: "Cộng đồng",
      links: [
        { label: "Cộng đồng", href: "#testimonials" },
        { label: "Blog", href: "#blog" },
      ],
    },
    {
      title: "Pháp lý",
      links: [
        { label: "Điều khoản sử dụng", href: "#" },
        { label: "Chính sách bảo mật", href: "#" },
      ],
    },
  ];

  const handleNavClick = (href: string) => {
    if (href.startsWith("#")) {
      if (href === "#") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      try {
        const el = document.querySelector(href);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (err) {
        console.error("Invalid selector:", href, err);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="bg-[#0a1128] text-gray-400 border-t border-[#111c44]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="StudyMatch Logo"
                className="w-8 h-8 object-cover rounded-full flex-shrink-0"
              />
              <span className="text-lg font-bold text-white tracking-tight">StudyMatch</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Nền tảng kết nối học tập thông minh. Đồng hành cùng sinh viên Khoa Công nghệ Thông tin - Trường Đại học Nông Lâm TP.HCM chia sẻ tri thức và cùng nhau tiến bộ.
            </p>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-6 grid grid-cols-3 gap-8">
            {footerLinks.map((group) => (
              <div key={group.title} className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  {group.title}
                </h4>
                <ul className="space-y-2">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("#") ? (
                        <button
                          onClick={() => handleNavClick(link.href)}
                          className="text-sm text-gray-400 hover:text-white transition-colors text-left"
                        >
                          {link.label}
                        </button>
                      ) : (
                        <a
                          href={link.href}
                          className="text-sm text-gray-400 hover:text-white transition-colors"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Copyright Area */}
      <div className="border-t border-[#111c44] bg-[#070c1e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {currentYear} StudyMatch. Tất cả các quyền được bảo lưu.</p>
          <p>Phát triển với ♥ dành riêng cho cộng đồng sinh viên NLU.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
