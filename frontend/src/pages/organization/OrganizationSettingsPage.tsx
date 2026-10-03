import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, Form, Input, Button, message, Upload, Tag, Tabs } from 'antd';
import { Palette, Check, ExternalLink, Image as ImageIcon, Building, UploadCloud, Info, Layers, Award } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { RbaPageHeader } from '../../components/common/RbaPageHeader';
import { useTheme } from '../../components/theme/ThemeProvider';
import { CourseTaxonomiesManager } from '../../components/taxonomies/CourseTaxonomiesManager';
import { CertificateView } from '../../components/certificate/CertificateView';

export const OrganizationSettingsPage: React.FC = () => {
  const [themeForm] = Form.useForm();
  const [detailsForm] = Form.useForm();
  const [certForm] = Form.useForm();
  const { refreshTheme, orgProfile, applyCustomTheme } = useTheme();
  const [previewLogo, setPreviewLogo] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  // Load Organization Details
  const { data: orgDetails } = useQuery({
    queryKey: ['org-details-settings'],
    queryFn: async () => {
      const res = await ApiClient.get('/organizations/GetOrganizationDetails');
      return res.data.data;
    },
  });

  // Load Theme Settings
  const { data: themeSettings, refetch: refetchThemeSettings } = useQuery({
    queryKey: ['org-theme-settings'],
    queryFn: async () => {
      const res = await ApiClient.get('/organizations/GetOrganizationThemeSettings');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (orgDetails) {
      detailsForm.setFieldsValue(orgDetails);
      if (orgDetails.logo_url) setPreviewLogo(orgDetails.logo_url);
    }
  }, [orgDetails, detailsForm]);

  useEffect(() => {
    if (themeSettings) {
      themeForm.setFieldsValue(themeSettings);
      certForm.setFieldsValue(themeSettings);
    }
  }, [themeSettings, themeForm, certForm]);

  // Handle Logo / Favicon / Certificate File Upload with standardized naming
  const handleUploadBranding = async (
    file: File,
    type: 'logo' | 'favicon' | 'certificate_background' | 'certificate_signature'
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    if (type === 'logo') setUploadingLogo(true);
    else if (type === 'favicon') setUploadingFavicon(true);
    else if (type === 'certificate_background') setUploadingBackground(true);
    else setUploadingSignature(true);

    try {
      const res = await ApiClient.post('/organizations/UploadOrganizationBranding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url;
      const fileName = res.data?.data?.fileName;

      if (type === 'logo') {
        detailsForm.setFieldsValue({ logoUrl: url });
        setPreviewLogo(url);
        message.success(`Logo uploaded and converted to: ${fileName}`);
      } else if (type === 'favicon') {
        detailsForm.setFieldsValue({ faviconUrl: url });
        message.success(`Favicon uploaded and converted to: ${fileName}`);
      } else if (type === 'certificate_background') {
        certForm.setFieldsValue({ certificateBackgroundUrl: url });
        message.success(`Certificate template uploaded and converted to: ${fileName}`);
      } else if (type === 'certificate_signature') {
        certForm.setFieldsValue({ certificateSignatureUrl: url });
        message.success(`Signatory signature uploaded and converted to: ${fileName}`);
      }
      refetchThemeSettings();
      refreshTheme();
      window.dispatchEvent(new CustomEvent('novacodex:theme-updated'));
    } catch (err: any) {
      message.error(err.response?.data?.message || `Failed to upload ${type}`);
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else if (type === 'favicon') setUploadingFavicon(false);
      else if (type === 'certificate_background') setUploadingBackground(false);
      else setUploadingSignature(false);
    }
  };

  // Update Theme Mutation
  const updateThemeMutation = useMutation({
    mutationFn: async (values: any) => {
      return ApiClient.put('/organizations/UpdateOrganizationThemeSettings', values);
    },
    onSuccess: (res: any) => {
      message.success('Brand theme updated! The interface has re-styled dynamically.');
      const updatedTheme = res.data?.data;
      if (updatedTheme) {
        applyCustomTheme(updatedTheme);
        window.dispatchEvent(new CustomEvent('novacodex:theme-updated', { detail: updatedTheme }));
      } else {
        refreshTheme();
      }
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update theme.');
    },
  });

  // Update Details Mutation
  const updateDetailsMutation = useMutation({
    mutationFn: async (values: any) => {
      return ApiClient.put('/organizations/UpdateOrganizationDetails', values);
    },
    onSuccess: () => {
      message.success('Organization profile updated successfully.');
      refreshTheme();
      window.dispatchEvent(new CustomEvent('novacodex:theme-updated'));
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update academy profile.');
    },
  });

  // Update Certificate Settings Mutation
  const updateCertMutation = useMutation({
    mutationFn: async (values: any) => {
      return ApiClient.put('/organizations/UpdateOrganizationThemeSettings', {
        ...themeSettings,
        ...values,
      });
    },
    onSuccess: (res: any) => {
      message.success('Certificate design and signatory details saved successfully.');
      refetchThemeSettings();
      const updatedTheme = res.data?.data;
      if (updatedTheme) {
        applyCustomTheme(updatedTheme);
        window.dispatchEvent(new CustomEvent('novacodex:theme-updated', { detail: updatedTheme }));
      } else {
        refreshTheme();
      }
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Failed to update certificate settings.');
    },
  });

  const orgSlug = orgDetails?.slug || 'yourorg';
  const cleanSlug = orgSlug.replace(/[^a-z0-9]/g, '');

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <RbaPageHeader
        title="Academy Settings & Taxonomies"
        subtitle="Customize academy branding, dynamic theme colors, and course taxonomies (categories & difficulty levels)"
        action={
          orgDetails?.slug && (
            <Button
              icon={<ExternalLink className="w-4 h-4" />}
              href={`/academy/${orgDetails.slug}`}
              target="_blank"
            >
              Preview Public Page
            </Button>
          )
        }
      />

      <Tabs
        defaultActiveKey="branding"
        className="mt-2"
        items={[
          {
            key: 'branding',
            label: (
              <span className="flex items-center gap-2 font-medium">
                <Palette className="w-4 h-4" /> Branding & Theme
              </span>
            ),
            children: (
              <div className="space-y-6 mt-2">
        {/* Naming Standardization Banner */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Automated Standardized Asset Naming:</span> When you upload any image or video, the platform automatically sanitizes and renames it to match your academy identity (e.g. <code>{cleanSlug}logo.png</code>, <code>{cleanSlug}favicon.ico</code>, <code>{cleanSlug}coursename.jpg</code>).
          </div>
        </div>

        {/* Organization Information & Logo */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Academy Identity & Logo</span>
            </div>
          }
          className="!rounded-xl border border-[#e5e5e5]"
        >
          <Form
            form={detailsForm}
            layout="vertical"
            onFinish={(vals) => updateDetailsMutation.mutate(vals)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item name="name" label="Academy / Organization Name" rules={[{ required: true, message: 'Academy name is required' }]}>
                <Input placeholder="e.g. Apex Coding Academy" />
              </Form.Item>
              <Form.Item name="domain" label="Custom Domain (CNAME)" tooltip="Point your custom domain DNS CNAME to our platform">
                <Input placeholder="learn.yourdomain.com" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Logo with Upload */}
              <div>
                <Form.Item
                  name="logoUrl"
                  label={`Academy Logo (Saved as: ${cleanSlug}logo.ext)`}
                  className="!mb-2"
                >
                  <Input
                    placeholder="Enter URL or upload below"
                    onChange={(e) => setPreviewLogo(e.target.value)}
                  />
                </Form.Item>
                <Upload
                  showUploadList={false}
                  accept="image/*"
                  beforeUpload={(file) => {
                    handleUploadBranding(file, 'logo');
                    return false;
                  }}
                >
                  <Button
                    icon={<UploadCloud className="w-3.5 h-3.5" />}
                    loading={uploadingLogo}
                    size="small"
                    className="text-xs"
                  >
                    Upload Logo File
                  </Button>
                </Upload>
              </div>

              {/* Favicon with Upload */}
              <div>
                <Form.Item
                  name="faviconUrl"
                  label={`Browser Favicon (Saved as: ${cleanSlug}favicon.ext)`}
                  className="!mb-2"
                >
                  <Input placeholder="Enter URL or upload below" />
                </Form.Item>
                <Upload
                  showUploadList={false}
                  accept="image/*,.ico"
                  beforeUpload={(file) => {
                    handleUploadBranding(file, 'favicon');
                    return false;
                  }}
                >
                  <Button
                    icon={<UploadCloud className="w-3.5 h-3.5" />}
                    loading={uploadingFavicon}
                    size="small"
                    className="text-xs"
                  >
                    Upload Favicon File
                  </Button>
                </Upload>
              </div>
            </div>

            {/* Live Logo Preview */}
            <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Live Logo Preview (as seen by students)
              </div>
              <div className="h-14 flex items-center px-4 bg-white rounded border border-dashed border-gray-300">
                {previewLogo ? (
                  <img
                    src={previewLogo}
                    alt="Logo Preview"
                    className="h-10 max-w-[200px] object-contain"
                    onError={() => message.warning('Could not load preview from this Logo URL.')}
                  />
                ) : (
                  <span className="text-xs text-gray-400 italic">No logo uploaded yet. Default monogram will be displayed.</span>
                )}
              </div>
            </div>

            <Button type="primary" htmlType="submit" loading={updateDetailsMutation.isPending}>
              Save Academy Identity
            </Button>
          </Form>
        </Card>

        {/* Dynamic Color Theme Form */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-600" />
              <span>Dynamic Color Styling</span>
            </div>
          }
          className="!rounded-xl border border-[#e5e5e5]"
        >
          <div className="text-xs text-gray-500 mb-6 bg-purple-50 p-3 rounded-lg border border-purple-100">
            Changes applied here automatically re-theme your navigation, buttons, and student learning interface via CSS variables.
          </div>

          <Form
            form={themeForm}
            layout="vertical"
            onFinish={(vals) => updateThemeMutation.mutate(vals)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Form.Item name="primaryColor" label="Primary Brand Color">
                <Input type="color" className="h-10 cursor-pointer p-1" />
              </Form.Item>

              <Form.Item name="sidebarColor" label="Sidebar Background Color">
                <Input type="color" className="h-10 cursor-pointer p-1" />
              </Form.Item>

              <Form.Item name="buttonColor" label="Button Color">
                <Input type="color" className="h-10 cursor-pointer p-1" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item name="sidebarTextColor" label="Sidebar Text Color">
                <Input type="color" className="h-10 cursor-pointer p-1" />
              </Form.Item>

              <Form.Item name="buttonTextColor" label="Button Text Color">
                <Input type="color" className="h-10 cursor-pointer p-1" />
              </Form.Item>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              loading={updateThemeMutation.isPending}
              icon={<Check className="w-4 h-4" />}
              className="mt-2"
            >
              Apply Theme Changes
            </Button>
          </Form>
        </Card>
              </div>
            ),
          },
          {
            key: 'taxonomies',
            label: (
              <span className="flex items-center gap-2 font-medium">
                <Layers className="w-4 h-4" /> Course Classifications
              </span>
            ),
            children: (
              <div className="mt-2">
                <CourseTaxonomiesManager />
              </div>
            ),
          },
          {
            key: 'certificates',
            label: (
              <span className="flex items-center gap-2 font-medium">
                <Award className="w-4 h-4 text-amber-500" /> Certificate Design & Template
              </span>
            ),
            children: (
              <div className="space-y-6 mt-2">
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                  <Award className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">Custom Academy Certificate Branding:</span> Customize the official certificate issued to students when they complete courses at your academy. Upload your background design template and director signature image.
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Certificate Settings Form */}
                  <div className="lg:col-span-5 space-y-4">
                    <Card
                      title={
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-600" />
                          <span>Signatory & Layout Settings</span>
                        </div>
                      }
                      className="!rounded-xl border border-[#e5e5e5]"
                    >
                      <Form
                        form={certForm}
                        layout="vertical"
                        onFinish={(vals) => updateCertMutation.mutate(vals)}
                        initialValues={{
                          certificateTitle: 'Certificate of Completion',
                          certificateSignatoryName: 'Dr. Vikram Malhotra',
                          certificateSignatoryTitle: 'Dean of Academic Affairs',
                          certificateAccentColor: '#0f172a',
                        }}
                      >
                        <Form.Item
                          name="certificateTitle"
                          label="Certificate Header Title"
                          rules={[{ required: true, message: 'Title is required' }]}
                        >
                          <Input placeholder="e.g. Certificate of Completion / Achievement" />
                        </Form.Item>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Form.Item
                            name="certificateSignatoryName"
                            label="Signatory Full Name"
                            rules={[{ required: true, message: 'Signatory name is required' }]}
                          >
                            <Input placeholder="e.g. Dr. Vikram Malhotra" />
                          </Form.Item>

                          <Form.Item
                            name="certificateSignatoryTitle"
                            label="Signatory Title"
                            rules={[{ required: true, message: 'Signatory title is required' }]}
                          >
                            <Input placeholder="e.g. Dean of Academic Affairs" />
                          </Form.Item>
                        </div>

                        <Form.Item
                          name="certificateAccentColor"
                          label="Border & Accent Color"
                        >
                          <Input type="color" className="h-10 cursor-pointer p-1" />
                        </Form.Item>

                        <div className="border-t border-gray-100 pt-3 space-y-4">
                          {/* Signature Image Upload */}
                          <div>
                            <Form.Item
                              name="certificateSignatureUrl"
                              label={`Signatory Signature Image (Saved as: ${cleanSlug}signature.ext)`}
                              className="!mb-2"
                            >
                              <Input placeholder="Enter image URL or upload file below" />
                            </Form.Item>
                            <Upload
                              showUploadList={false}
                              accept="image/*"
                              beforeUpload={(file) => {
                                handleUploadBranding(file, 'certificate_signature');
                                return false;
                              }}
                            >
                              <Button
                                icon={<UploadCloud className="w-3.5 h-3.5" />}
                                loading={uploadingSignature}
                                size="small"
                                className="text-xs"
                              >
                                Upload Signature File (PNG with transparent bg)
                              </Button>
                            </Upload>
                          </div>

                          {/* Custom Certificate Background Template Upload */}
                          <div>
                            <Form.Item
                              name="certificateBackgroundUrl"
                              label={`Certificate Background Template (Saved as: ${cleanSlug}certbackground.ext)`}
                              className="!mb-2"
                              tooltip="Optional. Upload a high-res landscape border or watermark background."
                            >
                              <Input placeholder="Enter background URL or upload below" />
                            </Form.Item>
                            <Upload
                              showUploadList={false}
                              accept="image/*"
                              beforeUpload={(file) => {
                                handleUploadBranding(file, 'certificate_background');
                                return false;
                              }}
                            >
                              <Button
                                icon={<UploadCloud className="w-3.5 h-3.5" />}
                                loading={uploadingBackground}
                                size="small"
                                className="text-xs"
                              >
                                Upload Background Template (Landscape 16:9)
                              </Button>
                            </Upload>
                          </div>
                        </div>

                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={updateCertMutation.isPending}
                          className="w-full mt-5 !bg-black font-semibold"
                        >
                          Save Certificate Design
                        </Button>
                      </Form>
                    </Card>
                  </div>

                  {/* Right Column: Live Certificate Preview */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Live Certificate Preview (Student View)
                      </span>
                      <Tag color="purple" className="text-[10px] font-semibold">
                        Real-time Preview
                      </Tag>
                    </div>

                    <Form.Item noStyle shouldUpdate>
                      {() => {
                        const formVals = certForm.getFieldsValue();
                        return (
                          <div className="border border-gray-200 rounded-2xl p-2 bg-gray-50 shadow-inner overflow-hidden flex justify-center">
                            <CertificateView
                              cert={{
                                certificate_number: 'Novacodex-2026-SAMPLE',
                                student_name: 'Aditya Roy',
                                course_title: 'Full-Stack TypeScript & React Mastery',
                                organization_name: orgDetails?.name || 'Apex Coding Academy',
                                organization_logo_url: detailsForm.getFieldValue('logoUrl') || orgDetails?.logo_url,
                                issue_date: new Date().toISOString(),
                                certificate_title: formVals.certificateTitle || themeSettings?.certificateTitle || 'Certificate of Completion',
                                certificate_signatory_name: formVals.certificateSignatoryName || themeSettings?.certificateSignatoryName || 'Dr. Vikram Malhotra',
                                certificate_signatory_title: formVals.certificateSignatoryTitle || themeSettings?.certificateSignatoryTitle || 'Dean of Academic Affairs',
                                certificate_signature_url: formVals.certificateSignatureUrl || themeSettings?.certificateSignatureUrl,
                                certificate_background_url: formVals.certificateBackgroundUrl || themeSettings?.certificateBackgroundUrl,
                                certificate_accent_color: formVals.certificateAccentColor || themeSettings?.certificateAccentColor || '#0f172a',
                              }}
                              className="scale-[0.85] sm:scale-100 origin-top shadow-md"
                            />
                          </div>
                        );
                      }}
                    </Form.Item>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};
