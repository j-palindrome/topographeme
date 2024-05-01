#version 300 es
precision mediump float;

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
uniform sampler2D u_textTexture;
uniform sampler2D u_videoTexture;
uniform float angle;

#define PI 3.14159
#define TWO_PI 6.28318

vec2 posToUv(vec2 pos) {
  vec2 flipped = (pos + 1.0f) * 0.5f;
  flipped.y = 1.0f - flipped.y;
  return flipped;
}

vec2 rotate(vec2 velocity, float decimalOfCircle) {
  float theta = decimalOfCircle * PI * 2.0f;
  return vec2(cos(velocity.x * theta) - sin(velocity.y * theta), sin(velocity.x * theta) + cos(velocity.y * theta));
}

void main() {
  vec2 normVel = normalize(a_velocity);
  uv = posToUv(a_positionIn);
  vec4 speedSample = texture(u_sampler, mod(uv + normVel * u_circleSize, 1.0f));

  // sample the texture, where it is, and then in front. If the texture is BLACK at the location and WHITE in front, turn the heading to the right.
  vec4 textSample = texture(u_textTexture, uv);
  vec4 textFrontSample = texture(u_textTexture, mod(uv + u_circleSize * normVel, 1.0f));
  if(textFrontSample.a > textSample.a) {
    normVel = rotate(normVel, u_strength + angle * TWO_PI);
  } else if(textFrontSample.a < textSample.a) {
    normVel = rotate(normVel, u_strength * -1.0f - angle * TWO_PI);
  }

  a_speedOut = (1.0f - pow(speedSample.a, 1.0f / (pow(u_strength, 2.0f) * u_resolution.x / 8.0f))) * u_speed * (u_resolution.x / 60.0f);
  a_positionOut = mod(a_positionIn + normVel * a_speedOut / u_resolution.x + 1.0f, vec2(2.0f)) - 1.0f;

  a_audioOut = (a_speedIn - a_speedOut) * normVel.x;
  v_color = a_color;
  a_velocityOut = normVel;

  gl_PointSize = 2.0f;
  gl_Position = vec4(a_positionOut, 0.0f, 1.0f);
}
