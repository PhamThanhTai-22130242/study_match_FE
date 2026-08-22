import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ShieldCheck, AlertCircle, Clock, ArrowRight, RefreshCw } from "lucide-react";
import { confirmEmailVerification } from "../../../services/AuthService";
import { isApiSuccess } from "../../../config/apiClient";
import BackgroundLayer from "../components/BackgroundLayer";

type VerificationStatus = "loading" | "success" | "already_verified" | "expired" | "error";

export default function VerifyEmailConfirmPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const statusParam = searchParams.get("status");

  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // 1. Direct status override if backend redirected with status query param
    if (statusParam) {
      const lower = statusParam.toLowerCase();
      if (lower === "success" || lower === "verified") {
        setStatus("success");
        return;
      }
      if (lower === "already_verified" || lower === "token_used" || lower === "used") {
        setStatus("already_verified");
        return;
      }
      if (lower === "expired" || lower === "token_expired") {
        setStatus("expired");
        return;
      }
      if (lower === "error") {
        setStatus("error");
        setErrorMessage(searchParams.get("message") || "Xác thực email thất bại.");
        return;
      }
    }

    // 2. If token is missing and no status param
    if (!token) {
      setStatus("error");
      setErrorMessage("Không tìm thấy mã xác thực hợp lệ.");
      return;
    }

    // 3. Call backend confirm API
    let isMounted = true;

    async function verify() {
      try {
        const res = await confirmEmailVerification(token!);

        if (!isMounted) return;

        if (isApiSuccess(res) || res.success) {
          setStatus("success");
          return;
        }

        const codeStr = String(res.code || "").toUpperCase();
        const msgStr = (res.message || "").toLowerCase();

        if (
          codeStr === "TOKEN_USED" ||
          codeStr === "ALREADY_VERIFIED" ||
          msgStr.includes("token đã được sử dụng") ||
          msgStr.includes("đã được xác thực")
        ) {
          setStatus("already_verified");
        } else if (
          codeStr === "TOKEN_EXPIRED" ||
          codeStr === "EXPIRED" ||
          msgStr.includes("hết hạn")
        ) {
          setStatus("expired");
        } else {
          setStatus("error");
          setErrorMessage(res.message || "Liên kết xác thực không hợp lệ hoặc đã xảy ra lỗi.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus("error");
        setErrorMessage(err?.message || "Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token, statusParam]);

  return (
    <div className="relative min-h-screen bg-[#f7f5f0] flex items-center justify-center px-4 py-8 overflow-hidden">
      <BackgroundLayer />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg border border-slate-200">
        {/* Loading State */}
        {status === "loading" && (
          <div className="py-8">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">
              Đang xác thực tài khoản...
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Vui lòng chờ trong giây lát trong khi chúng tôi kiểm tra liên kết của bạn.
            </p>
          </div>
        )}

        {/* Success State */}
        {status === "success" && (
          <div>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-800">
              Xác thực Email thành công!
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Chúc mừng bạn! Email đã được xác thực thành công. Tài khoản StudyMatch của bạn đã sẵn sàng sử dụng.
            </p>

            <div className="mt-8">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Already Verified State */}
        {status === "already_verified" && (
          <div>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 ring-8 ring-blue-50">
              <ShieldCheck className="h-9 w-9 text-blue-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-800">
              Email đã được xác thực
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Tài khoản của bạn đã được xác thực từ trước. Bạn không cần phải thao tác lại nữa.
            </p>

            <div className="mt-4 rounded-xl bg-blue-50/80 px-4 py-3 text-xs text-blue-700 border border-blue-100">
              Hãy đăng nhập bằng tài khoản và mật khẩu của bạn để tiếp tục học tập cùng cộng đồng StudyMatch.
            </div>

            <div className="mt-8 space-y-3">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 shadow-sm"
              >
                <span>Đến trang Đăng nhập</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/"
                className="block w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        )}

        {/* Expired State */}
        {status === "expired" && (
          <div>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 ring-8 ring-amber-50">
              <Clock className="h-9 w-9 text-amber-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-800">
              Liên kết đã hết hạn
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Liên kết xác thực email này đã hết hạn hiệu lực vì lý do bảo mật. Vui lòng yêu cầu gửi lại liên kết mới.
            </p>

            <div className="mt-8 space-y-3">
              <Link
                to="/verify-email"
                className="block w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 shadow-sm"
              >
                Gửi lại email xác thực
              </Link>
              <Link
                to="/login"
                className="block w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 ring-8 ring-rose-50">
              <AlertCircle className="h-9 w-9 text-rose-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-800">
              Xác thực không thành công
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {errorMessage || "Liên kết xác thực không hợp lệ hoặc đã có lỗi phát sinh trong quá trình xử lý."}
            </p>

            <div className="mt-8 space-y-3">
              <Link
                to="/verify-email"
                className="block w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 shadow-sm"
              >
                Yêu cầu gửi lại email
              </Link>
              <Link
                to="/login"
                className="block w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
