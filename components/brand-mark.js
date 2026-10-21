import Image from "next/image"

/** @param {{ size?: number, className?: string }} props */
export default function BrandMark({ size = 40, className }) {
  return (
    <Image
      src="/icon.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
    />
  )
}
