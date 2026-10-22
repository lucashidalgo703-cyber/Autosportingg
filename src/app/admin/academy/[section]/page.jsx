import { notFound } from 'next/navigation';
import { academySections } from '../../../../lib/academy/catalog';
import CrmCard from '../../../../components/crm/ui/CrmCard';
import AcademyCourses from '../../../../components/crm/academy/AcademyCourses';

export default async function AcademySectionPage({ params }) {
    const { section } = await params;
    const entry = academySections.find(([id]) => id === section);
    if (!entry) notFound();
    if (section === 'cursos') return <AcademyCourses />;
    return <CrmCard><h1 className="text-[26px] font-bold">{entry[1]}</h1><p className="mt-3 text-crm-fg-muted">{entry[2]}</p><p className="mt-4 text-sm">Contenido en preparación por subetapas.</p></CrmCard>;
}
