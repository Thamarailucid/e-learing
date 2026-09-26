import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../../services/api/ApiClient';
import { Button, Tag, Divider, Spin } from 'antd';
import { PlayCircle, Lock, Clock, GraduationCap, ChevronLeft, LogIn } from 'lucide-react';
import { SecureStorageService } from '../../services/storage/SecureStorageService';

export const PublicCourseDetailsPage: React.FC = () => {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const session = SecureStorageService.GetDecryptedValue<any>('session');
  const isLoggedIn = Boolean(session?.tokens?.accessToken);

  const { data: courseData, isLoading, error } = useQuery({
    queryKey: ['public-course-details', courseSlug],
    queryFn: async () => {
      const res = await ApiClient.get(`/public/GetPublicCourseDetails/${encodeURIComponent(courseSlug || '')}`);
      const data = res.data?.data;
      if (data && data.course) {
        return { ...data.course, sections: data.sections };
      }
      return data;
    },
    enabled: !!courseSlug,
    retry: false,
  });

  const course = courseData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center flex-col">
        <h2 className="text-xl font-bold mb-2">Course Not Found</h2>
        <p className="text-gray-500 mb-4">This course may be private, unpublished, or does not exist.</p>
        <Button onClick={() => navigate('/public/catalog')}>Back to Catalog</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e5e5] px-6 py-4 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button type="text" icon={<ChevronLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-bold text-[#111111]">{course.organization_name}</span>
        </div>
        {!isLoggedIn && (
          <Button icon={<LogIn className="w-4 h-4" />} onClick={() => navigate(`/login?orgSlug=${course.organization_slug}&enrollCourseId=${course.id}`)}>
            Sign In to Enroll
          </Button>
        )}
      </header>

      {/* Hero Section */}
      <div className="bg-gray-900 text-white relative overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay">
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover blur-lg" />
          ) : (
            <div className="w-full h-full bg-indigo-900 blur-xl"></div>
          )}
        </div>
        
        <div className="max-w-6xl mx-auto px-6 py-16 relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <Tag color="blue" className="mb-4 uppercase tracking-widest text-[10px] font-bold">{course.level || 'ALL LEVELS'}</Tag>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">{course.title}</h1>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-8 max-w-2xl">
              {course.description}
            </p>
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 mb-8">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{course.duration_minutes ? `${Math.round(course.duration_minutes)} Minutes` : 'Self Paced'}</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                <span>By {course.instructor_name || 'Instructor'}</span>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-80 shrink-0">
            <div className="bg-white rounded-2xl p-2 shadow-2xl overflow-hidden border border-white/10">
              <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden relative">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <PlayCircle className="w-10 h-10 mb-2 opacity-50" />
                    <span className="text-xs font-semibold">Course Preview</span>
                  </div>
                )}
              </div>
              <div className="p-4 text-center">
                {isLoggedIn ? (
                  <Button type="primary" block size="large" onClick={() => navigate(`/student/learn/${course.id}`)} className="bg-indigo-600 hover:bg-indigo-500 font-bold border-none h-12">
                    Go to Course Player
                  </Button>
                ) : (
                  <Button type="primary" block size="large" onClick={() => navigate(`/login?orgSlug=${course.organization_slug}&enrollCourseId=${course.id}`)} className="bg-black hover:bg-gray-800 text-white font-bold border-none h-12">
                    Login to Unlock
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Section */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-6 text-[#111111]">Course Curriculum</h2>
        <div className="space-y-6">
          {course.sections?.map((section: any) => (
            <div key={section.id} className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-5 py-4 border-b border-[#e5e5e5] font-bold text-gray-800">
                {section.title}
              </div>
              <div className="divide-y divide-gray-100">
                {section.lessons?.map((lesson: any) => (
                  <div key={lesson.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {lesson.is_free_preview ? (
                        <PlayCircle className="w-5 h-5 text-indigo-500" />
                      ) : (
                        <Lock className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <div className={`text-sm font-semibold ${lesson.is_free_preview ? 'text-indigo-900' : 'text-gray-700'}`}>
                          {lesson.title}
                          {lesson.is_free_preview && (
                            <Tag color="indigo" className="ml-2 !text-[9px] !rounded">FREE PREVIEW</Tag>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {lesson.duration_seconds ? `${Math.floor(lesson.duration_seconds / 60)}:${String(Math.floor(lesson.duration_seconds % 60)).padStart(2, '0')}` : 'Video'}
                    </div>
                  </div>
                ))}
                {(!section.lessons || section.lessons.length === 0) && (
                  <div className="px-5 py-4 text-sm text-gray-400 italic">No lessons in this section yet.</div>
                )}
              </div>
            </div>
          ))}
          {(!course.sections || course.sections.length === 0) && (
            <div className="text-center py-10 bg-white border border-[#e5e5e5] rounded-xl text-gray-500">
              Curriculum is being prepared.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
