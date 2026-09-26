import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Tag, Spin, Empty } from 'antd';
import { Building, BookOpen, Clock, User, LogIn, ChevronLeft, GraduationCap, CheckCircle } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { SecureStorageService } from '../../services/storage/SecureStorageService';

export const AcademyLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const isLoggedIn = Boolean(session?.tokens?.accessToken);

  const { data, isLoading, error } = useQuery({
    queryKey: ['academy-public-profile', slug],
    queryFn: async () => {
      const res = await ApiClient.get(`/public/GetAcademyPublicProfile/${slug}`);
      return res.data?.data;
    },
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <Building className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Academy Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">The requested academy does not exist or has been suspended.</p>
        <Button type="primary" onClick={() => navigate('/explore')}>
          Browse All Public Academies
        </Button>
      </div>
    );
  }

  const { academy, theme, courses } = data;
  const primaryColor = theme?.primaryColor || '#000000';

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      {/* Dynamic Themed Academy Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/explore" className="text-gray-400 hover:text-black transition-colors" title="Back to Explore">
              <ChevronLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-3">
              {academy.logoUrl ? (
                <img
                  src={academy.logoUrl}
                  alt={academy.name}
                  className="h-9 max-w-[160px] object-contain rounded"
                />
              ) : (
                <div
                  style={{ backgroundColor: primaryColor }}
                  className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold text-base shadow"
                >
                  {academy.name.charAt(0)}
                </div>
              )}
              <div>
                <span className="font-bold text-lg tracking-tight text-[#111111]">{academy.name}</span>
                <div className="text-[11px] text-gray-500">Official Learning Portal</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Button
                type="primary"
                style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                onClick={() => navigate('/student/dashboard')}
              >
                Go to Student Portal
              </Button>
            ) : (
              <>
                <Button onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button
                  type="primary"
                  style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                  onClick={() => navigate(`/login?mode=register&orgSlug=${academy.slug}`)}
                >
                  Join Academy
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Academy Hero Showcase */}
      <section
        style={{
          background: `linear-gradient(180deg, ${primaryColor}12 0%, #fafafa 100%)`,
        }}
        className="py-14 border-b border-gray-200"
      >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 mb-4 shadow-xs">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Verified Educational Tenant
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111111] tracking-tight mb-4">
            Welcome to {academy.name}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto mb-6">
            Empowering students with structured courses, in-video checkpoint assessments, and authentic accredited certification.
          </p>
        </div>
      </section>

      {/* Courses List */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Courses by {academy.name}</h2>
          <p className="text-xs text-gray-500">Explore curriculum published by our verified instructors</p>
        </div>

        {courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {courses.map((course: any) => (
              <Card
                key={course.id}
                hoverable
                className="!rounded-xl overflow-hidden border border-[#e5e5e5] flex flex-col justify-between hover:shadow-md transition-shadow"
                cover={
                  <div className="h-44 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center gap-1">
                        <BookOpen className="w-8 h-8 stroke-1" />
                        <span className="text-[11px]">No Thumbnail</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      <Tag color="black" className="!text-[10px] font-bold uppercase rounded-md px-2">
                        {course.level || 'ALL LEVELS'}
                      </Tag>
                    </div>
                  </div>
                }
              >
                <div>
                  <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug mb-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4">
                    {course.description || 'Comprehensive curriculum with video lessons and quizzes.'}
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-3 mt-auto">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {course.duration_minutes ? `${course.duration_minutes} mins` : `${course.lesson_count || 0} lessons`}
                    </span>
                    <span className="font-semibold text-gray-900 text-sm">
                      {course.price > 0 ? `₹${course.price}` : 'FREE'}
                    </span>
                  </div>

                  <Button
                    type="primary"
                    block
                    style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                    size="small"
                    onClick={() => navigate(`/course/${course.slug || course.id}`)}
                    className="text-xs font-medium text-white"
                  >
                    View Course Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Empty description={`No published courses available under ${academy.name} at this time.`} />
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} {academy.name}. Managed and powered by Novacodex Multi-Tenant Learning Management System.
      </footer>
    </div>
  );
};
