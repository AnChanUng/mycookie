import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import process from 'node:process'

function deploymentVersion() {
  return {
    name: 'deployment-version',
    generateBundle() {
      let commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT
      if (!commit) {
        try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }
        catch { commit = 'unknown' }
      }
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ commit, builtAt: new Date().toISOString() }) })
    },
  }
}

// 빌드한 곳에 따라 배포 환경을 정한다.
//   production : Vercel 운영 배포, Render 정적 사이트(운영), 그램 서버 운영 이미지(VITE_DEPLOY_ENV=production)
//   preview    : Vercel 미리보기(dev · 기능 브랜치) → 스테이징 백엔드를 쓴다
//   local      : 그 밖의 로컬 빌드 · 개발 서버
function deployEnv() {
  // 그램 온프레미스 서버: frontend/Dockerfile이 production · preview를 넘긴다
  if (['production', 'preview'].includes(process.env.VITE_DEPLOY_ENV)) return process.env.VITE_DEPLOY_ENV
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === 'production' ? 'production' : 'preview'
  if (process.env.RENDER) return 'production'
  return 'local'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), deploymentVersion()],
  define: {
    'import.meta.env.VITE_DEPLOY_ENV': JSON.stringify(deployEnv()),
  },
})
