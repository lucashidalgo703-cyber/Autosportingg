import { notFound } from 'next/navigation';
import { academySections } from '../../../../lib/academy/catalog';
import AcademyCourses from '../../../../components/crm/academy/AcademyCourses';
import AcademyLab from '../../../../components/crm/academy/AcademyLab';
import AcademyAssessments from '../../../../components/crm/academy/AcademyAssessments';
import AcademyProgress from '../../../../components/crm/academy/AcademyProgress';
import AcademyDecisions from '../../../../components/crm/academy/AcademyDecisions';
import AcademyTutor from '../../../../components/crm/academy/AcademyTutor';

export default async function AcademySectionPage({ params, searchParams }) {
    const { section } = await params;
    const entry = academySections.find(([id]) => id === section);
    if (!entry) notFound();
    if (section === 'cursos') {
        const query = await searchParams;
        return <AcademyCourses key={`${query?.curso}-${query?.leccion}`} initialCourse={query?.curso} initialLesson={query?.leccion} />;
    }
    if (section === 'simuladores') return <AcademyLab />;
    if (section === 'evaluaciones') return <AcademyAssessments />;
    if (section === 'progreso') return <AcademyProgress />;
    if (section === 'entrenador') return <AcademyDecisions />;
    if (section === 'tutor') return <AcademyTutor />;
    notFound();
}
