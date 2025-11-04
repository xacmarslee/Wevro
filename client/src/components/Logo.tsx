interface LogoProps {
  className?: string;
}

export default function Logo({ className = "w-10 h-10" }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 
        請在這裡貼上您的 SVG 內容
        
        提示：
        1. 只需要複製 <svg> 標籤內部的內容（path, circle, rect 等）
        2. 不要包含 <svg> 標籤本身
        3. 如果 SVG 有固定顏色，可以改成 currentColor 來支援主題切換
        
        範例：
        <path d="M50 10 L90 90 L10 90 Z" fill="currentColor" />
      */}
      
      {/* 臨時範例 Logo - 請替換為您的 SVG */}
      <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.1" />
      <path
        d="M30 30 L50 70 L70 30 M40 50 L60 50"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

