import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Tag, Button, message } from 'antd';
import { ShieldCheck, XCircle, Printer, Copy, CheckCircle2, ArrowLeft } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { CertificateView } from '../../components/certificate/CertificateView';

export const CertificateVerificationPage: React.FC = () => {
  const { certificateNumber } = useParams<{ certificateNumber: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['public-cert-verify', certificateNumber],
    queryFn: async () => {
      const res = await ApiClient.get(`/certificates/VerifyCertificate/${certificateNumber}`);
      return res.data.data;
    },
    enabled: !!certificateNumber,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Verifying credential authenticity against the tamper-evident registry...
      </div>
    );
  }

  const isValid = data?.isValid;
  const cert = data?.certificate;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    message.success('Verification URL copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-lg shadow-sm">
              N
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Novacodex Certificate Registry</h1>
              <p className="text-xs text-gray-500">Official Cryptographic Credential Verification</p>
            </div>
          </div>

          {isValid && (
            <div className="flex items-center gap-2">
              <Button
                icon={<Copy className="w-4 h-4" />}
                onClick={handleCopy}
                size="middle"
                className="text-xs"
              >
                Copy Link
              </Button>
              <Button
                type="primary"
                icon={<Printer className="w-4 h-4" />}
                onClick={handlePrint}
                className="!bg-black font-semibold text-xs"
                size="middle"
              >
                Print / Save PDF
              </Button>
            </div>
          )}
        </div>

        {isValid ? (
          <div className="space-y-6">
            {/* Authenticity Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-950">Verified & Authentic Credential</span>
                    <Tag color="success" className="font-semibold text-[10px] px-2 py-0">
                      ID: {cert.certificate_number}
                    </Tag>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    This certificate is an authentic credential issued by <strong>{cert.organization_name}</strong> and recorded in the Novacodex registry.
                  </p>
                </div>
              </div>

              <div className="text-xs text-emerald-900 font-mono shrink-0 sm:text-right">
                <span className="block text-emerald-700 font-sans font-medium text-[10px] uppercase">Status</span>
                <span className="font-semibold">Immutable Record ✓</span>
              </div>
            </div>

            {/* High-Resolution Certificate Render */}
            <div className="flex justify-center shadow-lg rounded-2xl overflow-hidden print:shadow-none">
              <CertificateView cert={cert} />
            </div>

            {/* Verification Metadata Breakdown */}
            <Card className="!rounded-2xl border border-gray-200 shadow-xs p-2 print:hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-gray-400 font-medium mb-0.5">Recipient</div>
                  <div className="text-gray-900 font-semibold text-sm">{cert.student_name}</div>
                </div>
                <div>
                  <div className="text-gray-400 font-medium mb-0.5">Course Title</div>
                  <div className="text-gray-900 font-semibold text-sm line-clamp-1">{cert.course_title}</div>
                </div>
                <div>
                  <div className="text-gray-400 font-medium mb-0.5">Issuing Organization</div>
                  <div className="text-gray-900 font-semibold text-sm">{cert.organization_name}</div>
                </div>
                <div>
                  <div className="text-gray-400 font-medium mb-0.5">Issue Date</div>
                  <div className="text-gray-900 font-semibold text-sm">
                    {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="!rounded-2xl border border-rose-200 shadow-sm text-center p-8 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Certificate Not Found</h3>
            <p className="text-xs text-gray-500 mb-6">
              The certificate ID <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">{certificateNumber}</code> could not be verified in the registry. It may be invalid, revoked, or mistyped.
            </p>
            <Button href="/" type="default" size="middle">
              Back to Home
            </Button>
          </Card>
        )}

        <div className="text-center pt-6 text-[11px] text-gray-400 print:hidden">
          Powered by Novacodex Multi-Tenant LMS Registry • Encrypted Verification Protocol
        </div>
      </div>
    </div>
  );
};
