import React from 'react';
import { Modal, Button, message } from 'antd';
import { Printer, Copy, ExternalLink, Download } from 'lucide-react';
import { CertificateView, CertificateData } from './CertificateView';

interface CertificateViewerModalProps {
  open: boolean;
  onClose: () => void;
  cert: CertificateData | null;
}

export const CertificateViewerModal: React.FC<CertificateViewerModalProps> = ({
  open,
  onClose,
  cert,
}) => {
  if (!cert) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const url = cert.verification_url || `${window.location.origin}/verify/${cert.certificate_number}`;
    navigator.clipboard.writeText(url);
    message.success('Verification URL copied to clipboard!');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={940}
      destroyOnClose
      centered
      className="certificate-modal !p-0"
    >
      <div className="p-4 sm:p-6 bg-gray-50 rounded-2xl">
        {/* Modal Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-base font-bold text-gray-900">Official Course Certificate</h3>
            <p className="text-xs text-gray-500">
              Verified academic certificate issued to {cert.student_name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              icon={<Copy className="w-4 h-4" />}
              onClick={handleCopyLink}
              size="small"
              className="text-xs"
            >
              Copy Verification Link
            </Button>
            <Button
              type="primary"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
              className="!bg-black font-semibold text-xs"
              size="small"
            >
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Certificate Display */}
        <div className="my-2 overflow-x-auto flex justify-center">
          <CertificateView cert={cert} />
        </div>

        {/* Instructions */}
        <div className="text-center mt-4 text-xs text-gray-400">
          Tip: Click <strong>"Print / Save PDF"</strong> and select "Save as PDF" with Landscape layout to save your certificate in pristine high resolution.
        </div>
      </div>
    </Modal>
  );
};
