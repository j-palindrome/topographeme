#version 300 es
 // License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
 // Full license: https://creativecommons.org/licenses/by-nc-sa/3.0/legalcode
 // Contact the author for other licensing options (sagejenson.com / @mxsage)
precision highp float;
uniform sampler2D u_trail;
in vec2 i_P;
in float i_A;
in float i_T;
out vec2 v_P;
out float v_A;
out float v_T;
uniform vec2 i_dim;
uniform int pen;
uniform float[19] v;
uniform float[8] mps;
uniform int frame;
vec2 bd(vec2 pos) {
  pos *= .5f;
  pos += vec2(.5f);
  pos -= floor(pos);
  pos -= vec2(.5f);
  pos *= 2.f;
  return pos;
}
float gn(in vec2 coordinate, in float seed) {
  return fract(tan(distance(coordinate * (seed + 0.118446744073709551614f), vec2(0.118446744073709551614f, 0.314159265358979323846264f))) * 0.141421356237309504880169f);
}
vec2 cr(float t) {
  vec2 G1 = vec2(mps[0], mps[1]);
  vec2 G2 = vec2(mps[2], mps[3]);
  vec2 G3 = vec2(mps[4], mps[5]);
  vec2 G4 = vec2(mps[6], mps[7]);
  vec2 A = G1 * -0.5f + G2 * 1.5f + G3 * -1.5f + G4 * 0.5f;
  vec2 B = G1 + G2 * -2.5f + G3 * 2.f + G4 * -.5f;
  vec2 C = G1 * -0.5f + G3 * 0.5f;
  vec2 D = G2;
  return t * (t * (t * A + B) + C) + D;
}
void main() {
  vec2 dir = vec2(cos(i_T), sin(i_T));
  float hd = i_dim.x / 2.f;
  vec2 sp = .5f * (i_P + vec2(1.0f));
  float sv = texture(u_trail, bd(sp + v[13] / hd * dir + vec2(0.f, v[12] / hd))).x;
  sv = max(sv, 0.000000001f);
  float sd = v[0] / hd + v[2] * pow(sv, v[1]) * 250.f / hd;
  float md = v[9] / hd + v[11] * pow(sv, v[10]) * 250.f / hd;
  float sa = v[3] + v[5] * pow(sv, v[4]);
  float ra = v[6] + v[8] * pow(sv, v[7]);
  float m = texture(u_trail, bd(sp + sd * vec2(cos(i_T), sin(i_T)))).x;
  float l = texture(u_trail, bd(sp + sd * vec2(cos(i_T + sa), sin(i_T + sa)))).x;
  float r = texture(u_trail, bd(sp + sd * vec2(cos(i_T - sa), sin(i_T - sa)))).x;
  float h = i_T;
  if(m > l && m > r) {
  } else if(m < l && m < r) {
    if(gn(i_P * 1332.4324f, i_T) > 0.5f)
      h += ra;
    else
      h -= ra;
  } else if(l < r)
    h -= ra;
  else if(l > r)
    h += ra;
  vec2 nd = vec2(cos(h), sin(h));
  vec2 op = i_P + nd * md;
  const float segmentPop = 0.0005f;
  if(pen == 1 && i_A < segmentPop) {
    op = 2.f * cr(i_A / segmentPop) - vec2(1.f);
    op += nd * pow(gn(i_P * 132.43f, i_T), 1.8f);
  }
  v_P = bd(op);
  v_A = fract(i_A + segmentPop);
  v_T = h;
}