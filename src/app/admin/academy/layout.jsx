import AcademyFrame from '../../../components/crm/academy/AcademyFrame';
import AcademyProgressProvider from '../../../components/crm/academy/AcademyProgressProvider';
export default function AcademyLayout({ children }) { return <AcademyProgressProvider><AcademyFrame>{children}</AcademyFrame></AcademyProgressProvider>; }
