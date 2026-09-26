import React from 'react';
import { Award, CheckCircle, ShieldCheck } from 'lucide-react';
import { formatLocal } from '../../utils/dateTimeUtils';

export interface CertificateData {
  certificate_number: string;
  student_name: string;
  course_title: string;
  organization_name: string;
  organization_logo_url?: string | null;
  issue_date?: string | Date | null;
  verification_url?: string;
  certificate_title?: string | null;
  certificate_signatory_name?: string | null;
  certificate_signatory_title?: string | null;
  certificate_signature_url?: string | null;
  certificate_background_url?: string | null;
  certificate_accent_color?: string | null;
  primary_color?: string | null;
}

interface CertificateViewProps {
  cert: CertificateData;
  className?: string;
  showVerificationBadge?: boolean;
}

export const CertificateView: React.FC<CertificateViewProps> = ({
  cert,
  className = '',
  showVerificationBadge = true,
}) => {
  const accentColor = cert.certificate_accent_color || cert.primary_color || '#1e1b4b';
  const certTitle = cert.certificate_title || 'Certificate of Completion';
  const signatoryName = cert.certificate_signatory_name || 'Academic Director';
  const signatoryTitle = cert.certificate_signatory_title || 'Head of Education & Certification';
  const issueDateFormatted = cert.issue_date
    ? formatLocal(cert.issue_date, 'MMMM DD, YYYY')
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div
      className={`certificate-container relative bg-white select-none overflow-hidden rounded-2xl shadow-xl border border-gray-200 aspect-[1.414/1] max-w-4xl w-full mx-auto flex flex-col justify-between p-8 sm:p-12 text-center print:shadow-none print:border-none print:m-0 print:w-full print:rounded-none ${className}`}
      style={{
        backgroundImage: cert.certificate_background_url ? `url(${cert.certificate_background_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Fallback Ornamental Double Border (when no custom background is uploaded) */}
      {!cert.certificate_background_url && (
        <div
          className="absolute inset-3 sm:inset-4 border-2 rounded-xl pointer-events-none"
          style={{ borderColor: `${accentColor}33` }}
        >
          <div
            className="absolute inset-1 border rounded-lg pointer-events-none"
            style={{ borderColor: accentColor }}
          />
          {/* Corner Ornaments */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 rotate-45" style={{ backgroundColor: accentColor }} />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rotate-45" style={{ backgroundColor: accentColor }} />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rotate-45" style={{ backgroundColor: accentColor }} />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rotate-45" style={{ backgroundColor: accentColor }} />
        </div>
      )}

      {/* Header: Issuing Academy & Logo */}
      <div className="relative z-10 flex items-center justify-between px-2 sm:px-6">
        <div className="flex items-center gap-3 text-left">
          {cert.organization_logo_url ? (
            <img
              src={cert.organization_logo_url}
              alt={cert.organization_name}
              className="h-10 sm:h-12 max-w-[140px] object-contain"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-lg shadow-sm"
              style={{ backgroundColor: accentColor }}
            >
              {cert.organization_name ? cert.organization_name[0].toUpperCase() : 'N'}
            </div>
          )}
          <div>
            <div className="text-xs sm:text-sm font-bold tracking-tight text-gray-900">
              {cert.organization_name}
            </div>
            <div className="text-[10px] text-gray-500 tracking-wider uppercase font-semibold">
              Verified Academic Institution
            </div>
          </div>
        </div>

        {showVerificationBadge && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Immutable & Verified</span>
          </div>
        )}
      </div>

      {/* Main Body: Certificate Title, Student Name, Course */}
      <div className="relative z-10 my-auto py-4 sm:py-6 px-4">
        <div
          className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold mb-2"
          style={{ color: accentColor }}
        >
          {certTitle}
        </div>

        <p className="text-xs sm:text-sm text-gray-500 font-serif italic mb-3 sm:mb-4">
          This document certifies that
        </p>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900 font-serif mb-3 sm:mb-4 capitalize">
          {cert.student_name || 'Learner Name'}
        </h1>

        <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto mb-2 leading-relaxed">
          has successfully fulfilled all required curriculum, video lectures, and assessments for
        </p>

        <div
          className="text-lg sm:text-2xl font-bold tracking-tight px-4 py-1.5 rounded-lg inline-block text-gray-900"
          style={{ color: accentColor }}
        >
          {cert.course_title}
        </div>
      </div>

      {/* Footer: Signatures, Issue Date, QR & ID */}
      <div className="relative z-10 grid grid-cols-3 items-end pt-4 sm:pt-6 px-2 sm:px-6 border-t border-gray-100/80">
        {/* Signatory */}
        <div className="text-left">
          <div className="h-12 sm:h-14 flex items-end mb-1">
            {cert.certificate_signature_url ? (
              <img
                src={cert.certificate_signature_url}
                alt="Signature"
                className="h-10 sm:h-12 max-w-[120px] object-contain"
              />
            ) : (
              <div className="font-serif italic text-lg sm:text-xl text-gray-700 border-b border-gray-400 pb-0.5 inline-block min-w-[100px]">
                {signatoryName}
              </div>
            )}
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-gray-900">{signatoryName}</div>
          <div className="text-[9px] sm:text-[10px] text-gray-500">{signatoryTitle}</div>
        </div>

        {/* Central Seal */}
        <div className="flex flex-col items-center justify-center">
          <div
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-dashed flex items-center justify-center mb-1 shadow-xs"
            style={{ borderColor: accentColor, color: accentColor }}
          >
            <Award className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div className="text-[9px] sm:text-[10px] tracking-widest uppercase font-bold text-gray-400">
            Official Seal
          </div>
        </div>

        {/* Issue Date & ID */}
        <div className="text-right">
          <div className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1">
            Date Issued: <span className="font-semibold text-gray-900">{issueDateFormatted}</span>
          </div>
          <div className="text-[9px] sm:text-[10px] text-gray-400 font-mono">
            ID: <span className="font-semibold text-gray-700">{cert.certificate_number}</span>
          </div>
          <div className="text-[9px] text-emerald-600 font-medium mt-0.5 flex items-center justify-end gap-1">
            <CheckCircle className="w-2.5 h-2.5" /> Authentic Credential
          </div>
        </div>
      </div>
    </div>
  );
};
