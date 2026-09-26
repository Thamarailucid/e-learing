import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Input, Button, Tag } from 'antd';
import { Search, PlayCircle, Clock, BookOpen, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '../../services/api/ApiClient';
import { RbaPageHeader } from '../../components/common/RbaPageHeader';

export const CourseCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: catalogData, isLoading } = useQuery({
    queryKey: ['public-course-catalog', search],
    queryFn: async () => {
      const res = await ApiClient.get(`/courses/GetCourseList?page=1&pageSize=30&isPublicOnly=true&search=${search}`);
      return res.data.data;
    },
  });

  const categories = ['All', 'Development', 'Business', 'Design', 'Marketing', 'Compliance'];

  const filteredCourses = catalogData?.filter((c: any) => {
    if (!selectedCategory || selectedCategory === 'All') return true;
    return c.category === selectedCategory;
  });

  return (
    <div>
      <RbaPageHeader
        title="Explore Course Catalog"
        subtitle="Discover verified online courses with interactive testing, hands-on practice, and verifiable certificates"
        action={
          <Button
            icon={<Gift className="w-4 h-4 text-purple-600" />}
            onClick={() => navigate('/student/dashboard')}
            className="border-purple-300 text-purple-700 font-semibold text-xs hover:!border-purple-400 hover:!bg-purple-50"
          >
            Redeem Exclusive Offer
          </Button>
        }
      />

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 whitespace-nowrap ${
                (cat === 'All' && !selectedCategory) || selectedCategory === cat
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <Input
            prefix={<Search className="w-4 h-4 text-gray-400 mr-1" />}
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses?.map((course: any) => (
          <Card
            key={course.id}
            hoverable
            className="!rounded-2xl border border-[#e5e5e5] overflow-hidden flex flex-col justify-between"
            onClick={() => navigate(`/student/learn/${course.id}`)}
          >
            <div>
              <div className="h-40 bg-gradient-to-tr from-gray-100 to-gray-200 rounded-xl mb-4 flex items-center justify-center text-gray-400">
                <PlayCircle className="w-12 h-12 opacity-40" />
              </div>

              <div className="flex items-center justify-between mb-2">
                <Tag color="blue">{course.category}</Tag>
                <span className="text-[11px] text-gray-500 font-medium">{course.level}</span>
              </div>

              <h3 className="font-bold text-base text-[#111111] line-clamp-1">{course.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-2 mt-1.5">
                {course.short_description || course.description || 'Comprehensive interactive learning path with verified completion.'}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{course.total_lessons_count || 1} Lessons</span>
              </div>
              <Button type="primary" size="small">
                Enroll & Start
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
