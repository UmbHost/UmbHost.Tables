using Microsoft.Extensions.DependencyInjection;
using UmbHost.Tables.PropertyEditors;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace UmbHost.Tables.Composers
{
    public class UmbHostTablesComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            builder.Services.AddSingleton<TablePropertyIndexValueFactory>();
        }
    }
}
