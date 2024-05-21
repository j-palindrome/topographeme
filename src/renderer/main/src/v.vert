in vec2 a_positionIn;
in vec2 a_velocity;
in vec4 a_color;
in float a_speedIn;

out vec2 a_positionOut;
out vec4 v_color;
out float a_speedOut;
out float a_audioOut;
out vec2 a_velocityOut;
out vec2 uv;

uniform float u_deltaTime;
uniform float u_time;
uniform sampler2D u_sampler;
uniform float u_circleSize;
uniform float u_speed;
uniform vec2 u_resolution;
uniform float u_strength;
uniform sampler2D u_videoTexture;
uniform float angle;

#define PI 3.14159
#define TWO_PI 6.28318

vec2 posToUv(vec2 pos) {
  vec2 flipped = (pos + 1.0) * 0.5;
  flipped.y = 1.0 - flipped.y;
  return flipped;
}

void main() {
}
