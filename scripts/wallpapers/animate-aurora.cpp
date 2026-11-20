// Render the authored panoramic sky as independent, additive curtains. The star field stays fixed.
// Usage: animate-aurora extended-sky.png original-height frames > sky.bgr
#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/imgcodecs.hpp>
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdio>
#include <iostream>
#include <vector>

using cv::Mat;
using cv::Point2f;
using cv::Vec3f;
constexpr float tau = 6.283185307f;

struct Curtain {
    std::vector<Point2f> spine;
    float spread, phase;
    int speed;
    float sway, lift;
};

// Centerlines follow the bright lower edges of the actual arcs, in source UV.
// Their different headings, periods, and wavelengths keep crossing curtains independent.
const std::array<Curtain, 6> curtains = {{
    {{{-.04f,.01f},{.06f,.10f},{.13f,.23f},{.20f,.34f},{.27f,.39f}}, .063f, .32f,  1, .020f, .024f},
    {{{-.03f,.23f},{.12f,.31f},{.24f,.36f},{.37f,.415f},{.47f,.475f},{.57f,.50f}}, .045f, 2.18f, -2, .015f, .017f},
    {{{.16f,.06f},{.28f,.17f},{.40f,.28f},{.50f,.36f},{.56f,.39f},{.63f,.475f}}, .060f, 4.65f, -1, .024f, .026f},
    {{{.28f,-.06f},{.39f,.12f},{.48f,.195f},{.55f,.26f},{.59f,.38f},{.63f,.47f}}, .076f, 1.45f,  2, .017f, .031f},
    {{{.639f,.36f},{.70f,.31f},{.78f,.20f},{.89f,.10f},{1.04f,-.04f}}, .073f, 3.60f, -1, .025f, .022f},
    {{{.60f,.48f},{.70f,.405f},{.82f,.35f},{.90f,.32f},{1.05f,.22f}}, .044f, 5.82f,  3, .013f, .019f}
}};

static float center(const std::vector<Point2f>& spine, float u) {
    for (size_t i=1; i<spine.size(); ++i) {
        if (u<=spine[i].x) {
            float f=std::clamp((u-spine[i-1].x)/(spine[i].x-spine[i-1].x),0.f,1.f);
            return spine[i-1].y+(spine[i].y-spine[i-1].y)*f;
        }
    }
    return spine.back().y;
}

int main(int argc, char** argv) {
    if (argc!=4) { std::cerr<<"Expected sky image, original height, and frame count\n"; return 2; }
    Mat sky=cv::imread(argv[1],cv::IMREAD_COLOR);
    if (sky.empty()) return 2;
    const int fullHeight=std::stoi(argv[2]), frames=std::stoi(argv[3]);
    if (frames<=0 || fullHeight < sky.rows) return 2;
    cv::setNumThreads(4);
    Mat opened, haze;
    cv::morphologyEx(sky,opened,cv::MORPH_OPEN,cv::getStructuringElement(cv::MORPH_ELLIPSE,{7,7}));
    cv::GaussianBlur(sky,haze,{0,0},28);
    Mat fixed(sky.size(),CV_32FC3);
    std::array<Mat,curtains.size()> emission;
    for (Mat& layer : emission) layer=Mat(sky.size(),CV_32FC3);
    for (int x=0; x<sky.cols; ++x) {
        float u=(x+.5f)/sky.cols;
        std::array<float, curtains.size()> limit{}, height{};
        for (size_t i=0; i<curtains.size(); ++i) {
            const auto& c=curtains[i];
            float beyond=std::max({0.f,c.spine.front().x-u,u-c.spine.back().x});
            limit[i]=std::exp(-.5f*beyond*beyond/(.043f*.043f));
            height[i]=center(c.spine,u);
        }
        for (int y=0; y<sky.rows; ++y) {
            float v=(y+.5f)/fullHeight;
            Vec3f rgb=sky.at<cv::Vec3b>(y,x), openedRgb=opened.at<cv::Vec3b>(y,x);
            Vec3f star=rgb-openedRgb;
            float strength=std::clamp((cv::norm(star)-7.)/21.,0.,1.);
            star*=strength;
            Vec3f diffuse=haze.at<cv::Vec3b>(y,x), base;
            const Vec3f night(13,8,3);
            for (int k=0;k<3;++k) base[k]=std::min(rgb[k]-star[k],night[k]+.10f*diffuse[k]);
            fixed.at<Vec3f>(y,x)=base+star;
            std::array<float,curtains.size()> weights{};
            float total=0;
            for (size_t i=0;i<curtains.size();++i) {
                float distance=(v-height[i])/curtains[i].spread;
                weights[i]=limit[i]*std::exp(-.5f*distance*distance);
                total+=weights[i];
            }
            for (size_t i=0;i<curtains.size();++i)
                emission[i].at<Vec3f>(y,x)=(rgb-base-star)*(weights[i]/std::max(total,1e-12f));
        }
    }
    Mat coordinates(sky.size(),CV_32FC2);
    for (int y=0;y<sky.rows;++y) for(int x=0;x<sky.cols;++x)
        coordinates.at<cv::Vec2f>(y,x)={float(x),float(y)};
    Mat output, grid(35,97,CV_32FC2), warp, lookup, fraction, moving, rgb8;
    for (int frame=0; frame<frames; ++frame) {
        const float t=tau*frame/288.f;
        fixed.copyTo(output);
        for (size_t i=0; i<curtains.size(); ++i) {
            const auto& c=curtains[i];
            for (int row=0;row<grid.rows;++row) for(int col=0;col<grid.cols;++col) {
                float u=(col+.5f)/grid.cols, v=(row+.5f)/grid.rows*sky.rows/fullHeight;
                float a=c.speed*t+c.phase;
                float fold=u*(11.f+i*1.53f)-v*3.2f;
                float dx=c.sway*(.65f*std::sin(a+fold)+.35f*std::sin(2*a-.61f*fold+v*10));
                float dy=c.lift*(.68f*std::sin(a-fold*.82f)+.32f*std::sin(2*a+fold*.55f+u*8));
                grid.at<cv::Vec2f>(row,col)={dx*sky.cols,dy*fullHeight};
            }
            cv::resize(grid,warp,sky.size(),0,0,cv::INTER_CUBIC);
            cv::add(warp,coordinates,warp);
            cv::convertMaps(warp,Mat(),lookup,fraction,CV_16SC2);
            cv::remap(emission[i],moving,lookup,fraction,cv::INTER_LINEAR,cv::BORDER_REPLICATE);
            const float light=1.f+.065f*std::sin(c.speed*t+c.phase)+.025f*std::cos(2*t-c.phase);
            cv::addWeighted(output,1.,moving,light,0.,output);
        }
        output.convertTo(rgb8,CV_8UC3);
        if (std::fwrite(rgb8.data,3*rgb8.total(),1,stdout)!=1) return 1;
    }
    return 0;
}
