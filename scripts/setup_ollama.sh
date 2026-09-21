#!/bin/bash
# Ollama 설치 및 Qwen3 모델 다운로드 스크립트

echo "=========================================="
echo " AI 역사 모의 법정 - Ollama 설정"
echo "=========================================="

# Ollama 설치 확인
if ! command -v ollama &> /dev/null; then
    echo "📥 Ollama 설치 중..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "✅ Ollama 이미 설치됨"
fi

# Ollama 서버 시작
echo "🚀 Ollama 서버 시작..."
ollama serve &
OLLAMA_PID=$!

# 서버 준비 대기
echo "⏳ Ollama 서버 준비 대기 중..."
sleep 5

# 모델 상태 확인
if ollama list | grep -q "qwen3:14b"; then
    echo "✅ qwen3:14b 모델 이미 다운로드됨"
else
    echo "📥 qwen3:14b 모델 다운로드 중... (약 8GB, 시간이 걸릴 수 있습니다)"
    ollama pull qwen3:14b
fi

echo ""
echo "=========================================="
echo " 설정 완료!"
echo " Ollama 서버: http://localhost:11434"
echo " 모델: qwen3:14b"
echo ""
echo " 테스트:"
echo " curl http://localhost:11434/api/tags"
echo "=========================================="
