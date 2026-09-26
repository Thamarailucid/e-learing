import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Input, Button, Card, Badge, Tag, Empty, Spin } from 'antd';
import { Search, BookOpen, Clock, User, Building, LogIn, UserPlus, GraduationCap, ChevronRight } from 'lucide-react';
import { ApiClient } from '../../services/api/ApiClient';
import { SecureStorageService } from '../../services/storage/SecureStorageService';

export const PublicCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const isLoggedIn = Boolean(session?.tokens?.accessToken);

  const { data: courses, isLoading } = useQuery({
    queryKey: ['public-courses', search],
    queryFn: async () => {
      const res = await ApiClient.get(`/public/GetPublicCatalog?search=${search}`);
      return res.data?.data || [];
    },
  });

  const getDashboardPath = () => {
    const role = session?.user?.role;
    if (session?.user?.isSuperAdmin || role === 'SUPER_ADMIN') return '/super-admin/dashboard';
    if (role === 'ORGANIZATION_ADMIN' || role === 'ORGANIZATION_OWNER') return '/organization/dashboard';
    if (role === 'INSTRUCTOR' || role === 'CONTENT_MANAGER') return '/instructor/dashboard';
    return '/student/dashboard';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      {/* Public Navigation Header */}
      <header className="bg-white border-b border-[#e5e5e5] px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-[#111111]">Novacodex Learning Hub</span>
              <div className="text-[11px] text-gray-500">Multi-Academy Online Course Platform</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Button
                type="primary"
                onClick={() => navigate(getDashboardPath())}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Go to My Dashboard
              </Button>
            ) : (
              <>
                <Button
                  icon={<LogIn className="w-4 h-4" />}
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
                <Button
                  type="primary"
                  icon={<UserPlus className="w-4 h-4" />}
                  onClick={() => navigate('/login?mode=register')}
                >
                  Create Student Account
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-12 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight mb-3">
            Explore Courses Across Top Academies
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto mb-8">
            Access verified video masterclasses, interactive checkpoints, and authenticated industry certifications.
          </p>

          <div className="max-w-xl mx-auto">
            <Input
              size="large"
              prefix={<Search className="w-5 h-5 text-gray-400 mr-2" />}
              placeholder="Search courses by topic, skill, or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="!rounded-xl shadow-sm"
              allowClear
            />
          </div>
        </div>
      </section>

      {/* Course Catalog Grid */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Featured Public Courses</h2>
            <p className="text-xs text-gray-500">Learn at your own pace with self-paced video modules</p>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Showing {courses?.length || 0} published courses
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <Spin size="large" />
            <div className="text-xs text-gray-400 mt-3">Loading available courses...</div>
          </div>
        ) : courses && courses.length > 0 ? (
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
                  {/* Academy attribution */}
                  <div className="flex items-center gap-1.5 mb-2">
                    {course.organization_logo_url ? (
                      <img
                        src={course.organization_logo_url}
                        alt=""
                        className="w-4 h-4 rounded object-contain"
                      />
                    ) : (
                      <Building className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <Link
                      to={`/academy/${course.organization_slug}`}
                      className="text-[11px] font-semibold text-gray-600 hover:text-blue-600 truncate"
                    >
                      {course.organization_name}
                    </Link>
                  </div>

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
                    size="small"
                    onClick={() => navigate(`/course/${course.slug || course.id}`)}
                    className="text-xs font-medium bg-black text-white"
                  >
                    View Course Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Empty
              description={
                search
                  ? `No published courses matching "${search}"`
                  : 'No published courses found yet. Instructors are publishing content soon!'
              }
            />
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Novacodex Learning Management System. Multi-tenant white-label academy infrastructure.
      </footer>
    </div>
  );
};
