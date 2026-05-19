import matplotlib
matplotlib.use('Agg') # Non-interactive backend
import matplotlib.pyplot as plt
import io

class ChartGenerator:
    @staticmethod
    def generate_pie_chart(data_dict, title=""):
        """
        Generates a pie chart from a dictionary of category: count
        """
        if not data_dict:
            return None
            
        labels = list(data_dict.keys())
        sizes = list(data_dict.values())
        
        # Filter out 0 sizes
        filtered_labels = []
        filtered_sizes = []
        for l, s in zip(labels, sizes):
            if s > 0:
                filtered_labels.append(l)
                filtered_sizes.append(s)
                
        if not filtered_sizes:
            return None

        fig, ax = plt.subplots(figsize=(4, 3))
        # Colors: nice modern palette
        colors = ['#3498DB', '#2ECC71', '#9B59B6', '#E74C3C', '#F1C40F', '#34495E']
        
        ax.pie(filtered_sizes, labels=filtered_labels, autopct='%1.1f%%', 
               startangle=90, colors=colors[:len(filtered_sizes)],
               textprops={'fontsize': 8})
               
        ax.axis('equal')
        if title:
            plt.title(title, pad=10, fontsize=10, fontweight='bold')
            
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=150)
        buf.seek(0)
        plt.close(fig)
        return buf

    @staticmethod
    def generate_bar_chart(labels, values, title="", ylabel="", xlabel=""):
        """
        Generates a bar chart
        """
        if not labels or not values:
            return None
            
        fig, ax = plt.subplots(figsize=(5, 3))
        bars = ax.bar(labels, values, color='#2980B9', alpha=0.8, width=0.6)
        
        if title:
            ax.set_title(title, pad=10, fontsize=10, fontweight='bold')
        if ylabel:
            ax.set_ylabel(ylabel, fontsize=9)
        if xlabel:
            ax.set_xlabel(xlabel, fontsize=9)
            
        # Add value labels on top of bars
        for bar in bars:
            yval = bar.get_height()
            if yval > 0:
                ax.text(bar.get_x() + bar.get_width()/2, yval, f'{yval:,.0f}', 
                        ha='center', va='bottom', fontsize=8)
                        
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        plt.xticks(rotation=45, ha='right', fontsize=8)
        plt.yticks(fontsize=8)
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=150)
        buf.seek(0)
        plt.close(fig)
        return buf
