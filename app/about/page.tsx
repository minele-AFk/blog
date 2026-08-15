'use client';

import { motion } from 'framer-motion';
import { Code, Heart, BookOpen, Mail, GitBranch, Send } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AboutPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  const skills = [
    { name: 'React', level: 95, color: '#61DAFB' },
    { name: 'Next.js', level: 90, color: '#000000' },
    { name: 'TypeScript', level: 85, color: '#3178C6' },
    { name: 'Tailwind CSS', level: 95, color: '#06B6D4' },
    { name: 'Node.js', level: 80, color: '#339933' },
    { name: 'Python', level: 75, color: '#3776AB' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl font-bold text-gradient">关于我</h1>
      </motion.div>

      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-8 md:p-12 mb-8"
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          <motion.div
            initial={isClient ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative"
          >
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30">
              <img
                src="/763e1704988fb73ab9fcb11f80253667.jpg"
                alt="戏子多秋"
                className="w-full h-full object-cover"
              />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-2 border-primary/30"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-2 rounded-full border-2 border-secondary/20"
            />
          </motion.div>

          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold mb-4">戏子多秋</h2>
            <p className="text-foreground-muted mb-6">
              热爱二次元和编程的开发者，喜欢探索新技术，也喜欢分享自己的学习心得。
              这个博客记录了我的技术成长、生活感悟以及二次元相关的内容。
            </p>
            <div className="flex justify-center md:justify-start gap-4">
              <motion.a
                href="#"
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-10 h-10 rounded-full bg-background-secondary border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary transition-colors"
              >
                <GitBranch className="w-5 h-5" />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-10 h-10 rounded-full bg-background-secondary border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary transition-colors"
              >
                <Send className="w-5 h-5" />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-10 h-10 rounded-full bg-background-secondary border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary transition-colors"
              >
                <Mail className="w-5 h-5" />
              </motion.a>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-8 mb-8"
      >
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Code className="w-5 h-5 text-cyan" />
          技能栈
        </h3>
        <div className="space-y-4">
          {skills.map((skill, index) => (
            <motion.div
              key={skill.name}
              initial={isClient ? { opacity: 0, x: -20 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center gap-4"
            >
              <span className="w-20 text-sm text-foreground-muted">{skill.name}</span>
              <div className="flex-1 h-2 rounded-full bg-background-secondary overflow-hidden">
                <motion.div
                  initial={isClient ? { width: 0 } : false}
                  animate={{ width: `${skill.level}%` }}
                  transition={{ duration: 1, delay: 0.4 + index * 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: skill.color }}
                />
              </div>
              <span className="w-10 text-sm text-foreground-muted text-right">{skill.level}%</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-8"
      >
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink" />
          兴趣爱好
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Code, title: '编程', description: '热爱前端开发，不断学习新技术' },
            { icon: Heart, title: '动漫', description: '二次元爱好者，喜欢看各种类型的动画' },
            { icon: BookOpen, title: '阅读', description: '喜欢阅读技术书籍和轻小说' },
          ].map((item) => (
            <motion.div
              key={item.title}
              whileHover={{ y: -4 }}
              className="p-4 rounded-xl bg-background-secondary border border-border-light"
            >
              <item.icon className="w-8 h-8 text-primary mb-3" />
              <h4 className="font-bold mb-1">{item.title}</h4>
              <p className="text-sm text-foreground-muted">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
