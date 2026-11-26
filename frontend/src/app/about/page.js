import LandingPage from '../../components/landing/LandingPage';

export const metadata = {
  title: 'AHA — ดูแลกันได้ แม้ไม่ได้อยู่ข้างกัน',
  description: 'AHA ช่วยเตือนการรับประทานยาและเชื่อมการดูแลกันระหว่างผู้สูงอายุและครอบครัว เรียนรู้วิธีเริ่มใช้งานได้ฟรี',
  openGraph: {
    title: 'AHA — ดูแลกันได้ แม้ไม่ได้อยู่ข้างกัน',
    description: 'ผู้ช่วยเตือนยาและเชื่อมความห่วงใยในครอบครัว',
    type: 'website',
  },
};

export default function Page() {
  return <LandingPage />;
}
