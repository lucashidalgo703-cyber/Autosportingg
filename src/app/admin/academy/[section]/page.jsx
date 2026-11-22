import { notFound } from 'next/navigation';
import { academySections, roleTrainingSections } from '../../../../lib/academy/catalog';
import AcademyCourses from '../../../../components/crm/academy/AcademyCourses';
import AcademyLab from '../../../../components/crm/academy/AcademyLab';
import AcademyAssessments from '../../../../components/crm/academy/AcademyAssessments';
import AcademyProgress from '../../../../components/crm/academy/AcademyProgress';
import AcademyDecisions from '../../../../components/crm/academy/AcademyDecisions';
import AcademyTutor from '../../../../components/crm/academy/AcademyTutor';
import AcademyMiCapacitacion from '../../../../components/crm/academy/AcademyMiCapacitacion';
import AcademyAprender from '../../../../components/crm/academy/AcademyAprender';
import AcademyPracticar from '../../../../components/crm/academy/AcademyPracticar';
import AcademyAprenderDelError from '../../../../components/crm/academy/AcademyAprenderDelError';
import AcademyNegociacion from '../../../../components/crm/academy/AcademyNegociacion';
import AcademyGestion from '../../../../components/crm/academy/AcademyGestion';
import AcademyDesafioDiario from '../../../../components/crm/academy/AcademyDesafioDiario';

export default async function AcademySectionPage({ params, searchParams }) {
    const { section } = await params;
    const isLegacySection = academySections.some(([id]) => id === section);
    const isRoleSection = roleTrainingSections.some(([id]) => id === section);

    if (!isLegacySection && !isRoleSection) notFound();

    // Secciones de Capacitación Práctica por Rol
    if (section === 'mi-capacitacion') return <AcademyMiCapacitacion />;
    if (section === 'desafio-diario') return <AcademyDesafioDiario />;
    if (section === 'aprender') return <AcademyAprender />;
    if (section === 'practicar') return <AcademyPracticar />;
    if (section === 'negociacion') return <AcademyNegociacion />;
    if (section === 'tutor') return <AcademyTutor />;
    if (section === 'aprender-del-error') return <AcademyAprenderDelError />;
    if (section === 'progreso') return <AcademyProgress />;
    if (section === 'gestion') return <AcademyGestion />;

    // Secciones del Catálogo Financiero Original (100% preservadas)
    if (section === 'cursos') {
        const query = await searchParams;
        return <AcademyCourses key={`${query?.curso}-${query?.leccion}`} initialCourse={query?.curso} initialLesson={query?.leccion} />;
    }
    if (section === 'simuladores') return <AcademyLab />;
    if (section === 'evaluaciones') return <AcademyAssessments />;
    if (section === 'entrenador') return <AcademyDecisions />;

    notFound();
}
