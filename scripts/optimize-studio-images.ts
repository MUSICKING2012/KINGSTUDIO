/**
 * /studios 실사진 최적화 파이프라인 (5d-3 fill-in — Studio_Slice_Spec §4-A).
 *
 * 소스 폴더(레포 밖, 오너 제공 원본)를 읽어 public/images/studios/ 에 웹용 JPEG 를 생성한다.
 *   pnpm tsx scripts/optimize-studio-images.ts <소스 폴더>
 *
 * - 출력 파일명 = 소스 파일명 kebab-case (예: "STUDIO A Booth 1.jpg" → studio-a-booth-1.jpg).
 *   슬롯 매핑은 페이지 코드가 파일명으로 참조한다 — 스크립트는 매핑을 모른다(관심사 분리).
 * - max 2400px(긴 변)·quality 82·EXIF 제거(메타데이터에 촬영 기기·GPS 잔존 방지 — §3.6 인접).
 * - 반응형 변환(webp/avif·srcset)은 next/image 런타임 담당 — 여기서는 정본 1장만 만든다.
 * - 멱등: 재실행 시 동일 입력 → 동일 출력 덮어쓰기.
 */
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'public', 'images', 'studios');
const MAX_EDGE = 2400;
const QUALITY = 82;

function toKebab(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const srcDir = process.argv[2];
  if (!srcDir) {
    console.error('사용법: pnpm tsx scripts/optimize-studio-images.ts <소스 폴더>');
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  const entries = await readdir(srcDir, { recursive: true, withFileTypes: true });
  const images = entries.filter((e) => e.isFile() && /\.(jpe?g|png|webp)$/i.test(e.name));
  if (images.length === 0) {
    console.error(`이미지 없음: ${srcDir}`);
    process.exit(1);
  }

  // 출력명 충돌 사전 검증 — recursive 순회는 부모 경로를 출력명에 반영하지 않으므로 같은
  // basename 이 서로 덮어쓸 수 있고, 비 ASCII 전용 basename 은 빈 stem 이 된다. 쓰기 전 전량 검사.
  const outNames = new Map<string, string>();
  for (const entry of images) {
    const srcPath = path.join(entry.parentPath, entry.name);
    const stem = toKebab(entry.name);
    if (!stem) {
      console.error(`빈 출력명(비 ASCII basename?): ${srcPath}`);
      process.exit(1);
    }
    const dup = outNames.get(stem);
    if (dup) {
      console.error(`출력명 충돌: ${dup} ↔ ${srcPath} → ${stem}.jpg`);
      process.exit(1);
    }
    outNames.set(stem, srcPath);
  }

  for (const entry of images) {
    const srcPath = path.join(entry.parentPath, entry.name);
    const outName = `${toKebab(entry.name)}.jpg`;
    const outPath = path.join(OUT_DIR, outName);
    const { width, height, size } = await sharp(srcPath)
      .rotate() // EXIF orientation 반영 후 메타 제거
      .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toFile(outPath);
    console.log(`${entry.name} → ${outName} (${width}x${height}, ${Math.round(size / 1024)}KB)`);
  }
}

main();
