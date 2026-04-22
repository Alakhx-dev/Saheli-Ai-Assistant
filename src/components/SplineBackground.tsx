import Spline from '@splinetool/react-spline';

export default function SplineBackground() {
  return (
    <div className="absolute inset-0 z-0 opacity-40 blur-[1px]">
      <Spline scene="https://prod.spline.design/HkCXeW8RCSFI52gC/scene.splinecode" />
    </div>
  );
}
