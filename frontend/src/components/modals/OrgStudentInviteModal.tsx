import React, { useState } from 'react';
import { Modal, Button, QRCode, message, Tag } from 'antd';
import { QrCode, Copy, Check, Download, ExternalLink, ShieldCheck, GraduationCap, Building2 } from 'lucide-react';

interface OrgStudentInviteModalProps {
  open: boolean;
  onClose: () => void;
  orgSlug?: string;
  orgName?: string;
  inviteCode?: string;
}

export const OrgStudentInviteModal: React.FC<OrgStudentInviteModalProps> = ({
  open,
  onClose,
  orgSlug = 'apex-academy',
  orgName = 'Academy',
  inviteCode,
}) => {
  const [copied, setCopied] = useState(false);

  const registrationUrl = `${window.location.origin}/register?orgSlug=${encodeURIComponent(orgSlug)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    message.success('Academy student registration link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = () => {
    const canvas = document.getElementById('org-reg-qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `Student-Registration-QR-${orgSlug}.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success('QR Code downloaded successfully.');
    }
  };

  return (
    <Modal
      open={open}
      title={
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-600" />
          <span>Academy Student Registration QR & Link</span>
        </div>
      }
      onCancel={onClose}
      footer={null}
      width={460}
      centered
      destroyOnHidden
    >
      <div className="py-2 text-center space-y-4">
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 font-medium">
          <Building2 className="w-3.5 h-3.5 text-gray-400" />
          <span>Organization Tenant:</span>
          <strong className="text-gray-800">{orgName}</strong>
          <Tag color="blue" className="text-[10px] font-mono ml-1 m-0">
            {inviteCode || orgSlug}
          </Tag>
        </div>

        <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
          Students can scan this QR code with their mobile cameras or use the unique URL below to register directly under your academy.
        </p>

        {/* QR Code Frame */}
        <div className="p-4 bg-white rounded-3xl border-2 border-indigo-100 inline-block shadow-md">
          <QRCode
            id="org-reg-qr-canvas"
            value={registrationUrl}
            size={200}
            bordered={false}
          />
        </div>

        {/* Copyable URL input box */}
        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono text-gray-700 break-all select-all flex items-center justify-between gap-2 text-left">
          <span className="truncate">{registrationUrl}</span>
          <Button
            size="small"
            type="text"
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={handleCopy}
            className="shrink-0"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            icon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            onClick={handleCopy}
          >
            {copied ? 'Copied Link' : 'Copy Registration Link'}
          </Button>
          <Button
            type="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownloadQr}
            className="!bg-indigo-600 hover:!bg-indigo-700"
          >
            Download QR Poster
          </Button>
        </div>

        {/* Info notice */}
        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-left text-xs text-indigo-900 flex items-start gap-2 mt-4">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Automated Tenant Onboarding:</strong> All users who register via this QR link are automatically provisioned as verified students under <strong>{orgName}</strong>, preventing orphan accounts.
          </div>
        </div>
      </div>
    </Modal>
  );
};
