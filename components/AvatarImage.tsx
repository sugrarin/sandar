import Image from "next/image";

interface AvatarImageProps {
  src: string;
  className: string;
}

function passthroughLoader({ src }: { src: string }) {
  return src;
}

export function AvatarImage({ src, className }: AvatarImageProps) {
  return (
    <Image
      src={src}
      alt=""
      className={className}
      width={96}
      height={96}
      loader={passthroughLoader}
      unoptimized
    />
  );
}
